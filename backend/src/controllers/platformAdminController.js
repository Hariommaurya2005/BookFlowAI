const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Customer = require('../models/Customer');
const Staff = require('../models/Staff');
const PlatformAuditLog = require('../models/PlatformAuditLog');
const { sendSuccess, sendError } = require('../utils/response');
const { parsePagination, escapeRegex, normalizeOrganizationStatus, validateStatusChangePayload } = require('../utils/platformAdminRules');
const { validateDemoSubscriptionPayload, resolveSubscription } = require('../utils/subscriptionPlans');
const logger = require('../utils/logger');

const businessOrganizationFilter = { isPlatformOrganization: { $ne: true } };

const getOverview = async (req, res, next) => {
  try {
    const [businessOrganizationIds, totalOrganizations, activeOrganizations, suspendedOrganizations] = await Promise.all([
      Organization.distinct('_id', businessOrganizationFilter),
      Organization.countDocuments(businessOrganizationFilter),
      Organization.countDocuments({ ...businessOrganizationFilter, active: true }),
      Organization.countDocuments({ ...businessOrganizationFilter, active: false }),
    ]);
    const tenantFilter = { organizationId: { $in: businessOrganizationIds } };
    const [totalUsers, totalAppointments, totalCustomers, totalStaff] = await Promise.all([
      User.countDocuments({ ...tenantFilter, role: { $ne: 'super_admin' } }),
      Appointment.countDocuments(tenantFilter),
      Customer.countDocuments(tenantFilter),
      Staff.countDocuments(tenantFilter),
    ]);

    sendSuccess(res, 'Platform overview retrieved', {
      totalOrganizations,
      activeOrganizations,
      suspendedOrganizations,
      totalUsers,
      totalAppointments,
      totalCustomers,
      totalStaff,
    });
  } catch (err) { next(err); }
};

const listOrganizations = async (req, res, next) => {
  try {
    const pagination = parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 });
    const statusFilter = normalizeOrganizationStatus(String(req.query.status || 'all').toLowerCase());
    if (!statusFilter.valid) return sendError(res, statusFilter.error, 400);

    const filter = { ...businessOrganizationFilter };
    if (statusFilter.value === 'active') filter.active = true;
    if (statusFilter.value === 'suspended') filter.active = false;

    const search = String(req.query.search || '').trim().slice(0, 100);
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ name: regex }, { email: regex }, { slug: regex }, { businessType: regex }];
    }

    const [organizations, total] = await Promise.all([
      Organization.find(filter)
        .select('name email phone businessType slug publicBookingEnabled subscriptionPlan subscriptionExpiry subscription active createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      Organization.countDocuments(filter),
    ]);

    const organizationIds = organizations.map((organization) => organization._id);
    const [owners, userCounts, appointmentCounts, customerCounts, staffCounts] = organizationIds.length ? await Promise.all([
      User.find({ organizationId: { $in: organizationIds }, role: 'business_owner' })
        .select('organizationId name email lastLogin')
        .sort({ createdAt: 1 })
        .lean(),
      User.aggregate([
        { $match: { organizationId: { $in: organizationIds }, role: { $ne: 'super_admin' } } },
        { $group: { _id: '$organizationId', count: { $sum: 1 } } },
      ]),
      Appointment.aggregate([{ $match: { organizationId: { $in: organizationIds } } }, { $group: { _id: '$organizationId', count: { $sum: 1 } } }]),
      Customer.aggregate([{ $match: { organizationId: { $in: organizationIds } } }, { $group: { _id: '$organizationId', count: { $sum: 1 } } }]),
      Staff.aggregate([{ $match: { organizationId: { $in: organizationIds } } }, { $group: { _id: '$organizationId', count: { $sum: 1 } } }]),
    ]) : [[], [], [], [], []];

    const toMap = (rows) => new Map(rows.map((row) => [String(row._id), row.count]));
    const userCountMap = toMap(userCounts);
    const appointmentCountMap = toMap(appointmentCounts);
    const customerCountMap = toMap(customerCounts);
    const staffCountMap = toMap(staffCounts);
    const ownerMap = new Map();
    owners.forEach((owner) => {
      const key = String(owner.organizationId);
      if (!ownerMap.has(key)) ownerMap.set(key, { name: owner.name, email: owner.email, lastLogin: owner.lastLogin || null });
    });

    const results = organizations.map((organization) => {
      const id = String(organization._id);
      const effectiveSubscription = resolveSubscription(organization);
      return {
        ...organization,
        subscription: {
          ...(organization.subscription || {}),
          plan: effectiveSubscription.plan,
          status: effectiveSubscription.status,
          isDemo: true,
          periodEndsAt: effectiveSubscription.periodEndsAt,
          trialEndsAt: effectiveSubscription.trialEndsAt,
          gracePeriodEndsAt: effectiveSubscription.gracePeriodEndsAt,
        },
        subscriptionPlan: effectiveSubscription.plan,
        subscriptionExpiry: effectiveSubscription.periodEndsAt || effectiveSubscription.trialEndsAt,
        owner: ownerMap.get(id) || null,
        usage: {
          users: userCountMap.get(id) || 0,
          appointments: appointmentCountMap.get(id) || 0,
          customers: customerCountMap.get(id) || 0,
          staff: staffCountMap.get(id) || 0,
        },
      };
    });

    sendSuccess(res, 'Organizations retrieved', {
      organizations: results,
      pagination: { page: pagination.page, limit: pagination.limit, total, totalPages: Math.ceil(total / pagination.limit) },
      filters: { search, status: statusFilter.value },
    });
  } catch (err) { next(err); }
};

const updateOrganizationStatus = async (req, res, next) => {
  try {
    const { organizationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(organizationId)) return sendError(res, 'Invalid organization ID.', 400);
    const validation = validateStatusChangePayload(req.body);
    if (!validation.valid) return sendError(res, validation.error, 400);

    const organization = await Organization.findOne({ _id: organizationId, ...businessOrganizationFilter });
    if (!organization) return sendError(res, 'Business organization not found.', 404);
    const previousActive = Boolean(organization.active);
    const { active, reason } = validation.value;

    if (previousActive === active) {
      return sendSuccess(res, `Organization is already ${active ? 'active' : 'suspended'}.`, {
        organizationId: organization._id,
        active: organization.active,
        changed: false,
      });
    }

    organization.active = active;
    await organization.save();

    try {
      await PlatformAuditLog.create({
        actorUserId: req.user._id,
        targetOrganizationId: organization._id,
        action: active ? 'ORGANIZATION_REACTIVATED' : 'ORGANIZATION_SUSPENDED',
        reason,
        previousActive,
        newActive: active,
        ipAddress: req.ip,
        userAgent: String(req.get('User-Agent') || '').slice(0, 300),
      });
    } catch (auditError) {
      logger.error(`Platform status change audit write failed for organization ${organization._id}: ${auditError.message}`);
      return sendError(res, 'The organization status changed, but the audit record could not be saved. Check server logs before retrying.', 500);
    }

    sendSuccess(res, active ? 'Organization reactivated.' : 'Organization suspended.', {
      organizationId: organization._id,
      name: organization.name,
      active: organization.active,
      changed: true,
    });
  } catch (err) { next(err); }
};

const updateOrganizationSubscription = async (req, res, next) => {
  try {
    const { organizationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(organizationId)) return sendError(res, 'Invalid organization ID.', 400);
    const validation = validateDemoSubscriptionPayload(req.body);
    if (!validation.valid) return sendError(res, validation.error, 400);

    const organization = await Organization.findOne({ _id: organizationId, ...businessOrganizationFilter });
    if (!organization) return sendError(res, 'Business organization not found.', 404);

    const previous = resolveSubscription(organization);
    const { plan, status, periodDays, gracePeriodDays, reason } = validation.value;
    const now = new Date();
    const afterDays = (days) => new Date(now.getTime() + days * 86400000);
    let periodEndsAt = null;
    let trialEndsAt = null;
    let gracePeriodEndsAt = null;

    if (status === 'active') {
      periodEndsAt = plan === 'free' ? null : afterDays(periodDays);
      gracePeriodEndsAt = periodEndsAt && gracePeriodDays > 0 ? new Date(periodEndsAt.getTime() + gracePeriodDays * 86400000) : null;
    } else if (status === 'trial') {
      trialEndsAt = afterDays(periodDays);
      gracePeriodEndsAt = gracePeriodDays > 0 ? new Date(trialEndsAt.getTime() + gracePeriodDays * 86400000) : null;
    } else if (status === 'grace_period') {
      periodEndsAt = new Date(now.getTime() - 1000);
      gracePeriodEndsAt = afterDays(Math.max(1, gracePeriodDays));
    } else if (status === 'expired') {
      periodEndsAt = new Date(now.getTime() - 86400000);
      gracePeriodEndsAt = new Date(now.getTime() - 1000);
    }

    organization.subscriptionPlan = plan;
    organization.subscriptionExpiry = periodEndsAt || trialEndsAt;
    organization.subscription = {
      plan,
      status,
      isDemo: true,
      startedAt: now,
      periodEndsAt,
      trialEndsAt,
      gracePeriodEndsAt,
      lastUpdatedBy: req.user._id,
      lastUpdatedReason: reason,
    };
    await organization.save();

    const current = resolveSubscription(organization);
    try {
      await PlatformAuditLog.create({
        actorUserId: req.user._id,
        targetOrganizationId: organization._id,
        action: 'SUBSCRIPTION_UPDATED',
        reason,
        previousActive: Boolean(organization.active),
        newActive: Boolean(organization.active),
        previousSubscription: { plan: previous.plan, status: previous.status, periodEndsAt: previous.periodEndsAt },
        newSubscription: { plan: current.plan, status: current.status, periodEndsAt: current.periodEndsAt, trialEndsAt: current.trialEndsAt, gracePeriodEndsAt: current.gracePeriodEndsAt },
        ipAddress: req.ip,
        userAgent: String(req.get('User-Agent') || '').slice(0, 300),
      });
    } catch (auditError) {
      logger.error(`Platform subscription audit write failed for organization ${organization._id}: ${auditError.message}`);
      return sendError(res, 'Subscription changed, but its audit record could not be saved. Check server logs before retrying.', 500);
    }

    sendSuccess(res, 'Demo subscription updated. No payment was processed.', {
      organizationId: organization._id,
      subscription: { plan: current.plan, status: current.status, isDemo: true, periodEndsAt: current.periodEndsAt, trialEndsAt: current.trialEndsAt, gracePeriodEndsAt: current.gracePeriodEndsAt },
    });
  } catch (error) { next(error); }
};

const listAuditLogs = async (req, res, next) => {
  try {
    const pagination = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
    const filter = {};
    if (req.query.action && ['ORGANIZATION_SUSPENDED', 'ORGANIZATION_REACTIVATED', 'SUBSCRIPTION_UPDATED'].includes(req.query.action)) {
      filter.action = req.query.action;
    }

    const [logs, total] = await Promise.all([
      PlatformAuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .populate('actorUserId', 'name email')
        .populate('targetOrganizationId', 'name email businessType')
        .lean(),
      PlatformAuditLog.countDocuments(filter),
    ]);

    sendSuccess(res, 'Platform audit logs retrieved', {
      logs,
      pagination: { page: pagination.page, limit: pagination.limit, total, totalPages: Math.ceil(total / pagination.limit) },
    });
  } catch (err) { next(err); }
};

module.exports = { getOverview, listOrganizations, updateOrganizationStatus, updateOrganizationSubscription, listAuditLogs };
