const Organization = require('../models/Organization');
const { sendSuccess, sendError } = require('../utils/response');
const { PLAN_CATALOG, isValidPlan } = require('../utils/subscriptionPlans');
const { getSubscriptionSnapshot } = require('../services/subscriptionService');

const getMySubscription = async (req, res, next) => {
  try {
    const organization = await Organization.findById(req.organizationId);
    if (!organization) return sendError(res, 'Organization not found.', 404);
    const snapshot = await getSubscriptionSnapshot(organization);
    return sendSuccess(res, 'Demo subscription retrieved.', snapshot);
  } catch (error) { return next(error); }
};

const selectDemoPlan = async (req, res, next) => {
  try {
    const plan = String(req.body?.plan || '').trim().toLowerCase();
    if (!isValidPlan(plan)) return sendError(res, 'Choose a valid demo plan: free, starter, or pro.', 400);
    const organization = await Organization.findById(req.organizationId);
    if (!organization) return sendError(res, 'Organization not found.', 404);

    const now = new Date();
    const isFree = plan === 'free';
    const periodEndsAt = isFree ? null : new Date(now.getTime() + 30 * 86400000);
    const gracePeriodEndsAt = periodEndsAt ? new Date(periodEndsAt.getTime() + 3 * 86400000) : null;
    organization.subscriptionPlan = plan;
    organization.subscriptionExpiry = periodEndsAt;
    organization.subscription = {
      plan,
      status: 'active',
      isDemo: true,
      startedAt: now,
      periodEndsAt,
      trialEndsAt: null,
      gracePeriodEndsAt,
      lastUpdatedBy: req.user._id,
      lastUpdatedReason: `Business owner selected the ${PLAN_CATALOG[plan].label} demo plan. No payment was processed.`,
    };
    await organization.save();

    const snapshot = await getSubscriptionSnapshot(organization);
    return sendSuccess(res, isFree ? 'Free demo plan activated. No payment was processed.' : `${PLAN_CATALOG[plan].label} demo access activated for 30 days. No payment was processed.`, snapshot);
  } catch (error) { return next(error); }
};

module.exports = { getMySubscription, selectDemoPlan };
