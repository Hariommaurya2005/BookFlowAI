const Staff = require('../models/Staff');
const Service = require('../models/Service');
const Appointment = require('../models/Appointment');
const Offer = require('../models/Offer');
const SubscriptionUsage = require('../models/SubscriptionUsage');
const { PLAN_CATALOG, resolveSubscription } = require('../utils/subscriptionPlans');

const monthWindow = (now = new Date()) => {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end, monthKey: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}` };
};

async function readUsage(organizationId, now = new Date()) {
  const { start, end, monthKey } = monthWindow(now);
  const [staff, services, monthlyBookings, activeOffers, usageRecord] = await Promise.all([
    Staff.countDocuments({ organizationId, isActive: true }),
    Service.countDocuments({ organizationId, isActive: true }),
    Appointment.countDocuments({ organizationId, createdAt: { $gte: start, $lt: end } }),
    Offer.countDocuments({ organizationId, isActive: true }),
    SubscriptionUsage.findOne({ organizationId, monthKey }).select('aiRequests').lean(),
  ]);
  return { staff, services, monthlyBookings, activeOffers, monthlyAiRequests: usageRecord?.aiRequests || 0, monthKey };
}

async function reserveAiRequest(organizationId, limit, now = new Date()) {
  const { monthKey } = monthWindow(now);
  try {
    await SubscriptionUsage.updateOne(
      { organizationId, monthKey },
      { $setOnInsert: { organizationId, monthKey, aiRequests: 0 } },
      { upsert: true }
    );
  } catch (error) {
    // A concurrent first request can win the unique organization/month insert.
    if (error.code !== 11000) throw error;
  }
  // Compare-and-set keeps simultaneous requests from incrementing beyond the configured limit.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const record = await SubscriptionUsage.findOne({ organizationId, monthKey }).select('aiRequests').lean();
    const current = Number(record?.aiRequests || 0);
    if (current >= limit) return { allowed: false, reason: 'AI monthly usage limit reached', usage: current, limit };
    const result = await SubscriptionUsage.updateOne(
      { organizationId, monthKey, aiRequests: current },
      { $inc: { aiRequests: 1 } }
    );
    if (result.modifiedCount === 1) return { allowed: true, usage: current + 1, limit };
  }
  return { allowed: false, reason: 'Could not reserve AI usage safely; retry the request', usage: null, limit };
}

async function checkOrganizationEntitlement(organization, feature, options = {}) {
  const now = options.now || new Date();
  const subscription = resolveSubscription(organization, now);
  const plan = PLAN_CATALOG[subscription.plan];
  if (subscription.isReadOnly) {
    return { allowed: false, httpStatus: 403, subscriptionStatus: subscription.status, subscription, message: subscription.status === 'expired' ? 'This demo subscription has expired. Ask the platform admin to reactivate it or choose a demo plan.' : 'This subscription is suspended. Contact platform support.' };
  }
  if (feature === 'advancedAI' && !plan.features.advancedAI) {
    return { allowed: false, httpStatus: 403, code: 'FEATURE_NOT_INCLUDED', subscription, message: 'This AI feature is available on Starter and Pro demo plans. Select a demo plan to try it; no payment is processed.' };
  }
  if (feature === 'publicBooking' && !plan.features.publicBooking) {
    return { allowed: false, httpStatus: 403, code: 'FEATURE_NOT_INCLUDED', subscription, message: 'Public booking is not included in this plan.' };
  }

  const limits = plan.limits;
  let usage;
  if (['staff', 'service', 'booking', 'offer'].includes(feature)) usage = await readUsage(organization._id, now);
  if (feature === 'staff' && usage.staff >= limits.staff) return { allowed: false, httpStatus: 429, code: 'PLAN_LIMIT_REACHED', subscription, usage, limit: limits.staff, message: `Your ${plan.label} demo plan allows up to ${limits.staff} active staff members.` };
  if (feature === 'service' && usage.services >= limits.services) return { allowed: false, httpStatus: 429, code: 'PLAN_LIMIT_REACHED', subscription, usage, limit: limits.services, message: `Your ${plan.label} demo plan allows up to ${limits.services} active services.` };
  if (feature === 'booking' && usage.monthlyBookings >= limits.monthlyBookings) return { allowed: false, httpStatus: 429, code: 'PLAN_LIMIT_REACHED', subscription, usage, limit: limits.monthlyBookings, message: `Your ${plan.label} demo plan allows ${limits.monthlyBookings} bookings created per calendar month.` };
  if (feature === 'offer' && usage.activeOffers >= limits.activeOffers) return { allowed: false, httpStatus: 429, code: 'PLAN_LIMIT_REACHED', subscription, usage, limit: limits.activeOffers, message: `Your ${plan.label} demo plan allows ${limits.activeOffers} active offers.` };

  if (feature === 'ai' || feature === 'advancedAI') {
    const reservation = options.consumeAI === false
      ? { allowed: true, usage: (await readUsage(organization._id, now)).monthlyAiRequests, limit: limits.monthlyAiRequests }
      : await reserveAiRequest(organization._id, limits.monthlyAiRequests, now);
    if (!reservation.allowed) return { allowed: false, httpStatus: 429, code: 'AI_USAGE_LIMIT_REACHED', subscription, message: `Your ${plan.label} demo plan has reached its limit of ${limits.monthlyAiRequests} AI requests this month.`, usage: reservation.usage, limit: reservation.limit };
    usage = usage || await readUsage(organization._id, now);
    usage.monthlyAiRequests = reservation.usage;
  }
  return { allowed: true, subscription, plan, limits, usage, warning: subscription.status === 'grace_period' ? 'Your demo subscription is in its grace period.' : null };
}

async function getSubscriptionSnapshot(organization, now = new Date()) {
  const subscription = resolveSubscription(organization, now);
  const usage = await readUsage(organization._id, now);
  return {
    subscription: {
      plan: subscription.plan,
      planLabel: subscription.planLabel,
      status: subscription.status,
      isDemo: true,
      startedAt: subscription.startedAt,
      periodEndsAt: subscription.periodEndsAt,
      trialEndsAt: subscription.trialEndsAt,
      gracePeriodEndsAt: subscription.gracePeriodEndsAt,
      effectiveEnd: subscription.effectiveEnd,
      daysRemaining: subscription.daysRemaining,
      isReadOnly: subscription.isReadOnly,
      lastUpdatedReason: organization.subscription?.lastUpdatedReason || '',
    },
    plan: PLAN_CATALOG[subscription.plan],
    plans: Object.values(PLAN_CATALOG),
    usage,
    billing: { providerConnected: false, paymentProcessed: false, notice: 'Demo subscriptions only. No payment gateway is connected.' },
  };
}

module.exports = { monthWindow, readUsage, reserveAiRequest, checkOrganizationEntitlement, getSubscriptionSnapshot };
