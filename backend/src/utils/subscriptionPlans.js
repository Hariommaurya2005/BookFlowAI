const PLAN_CATALOG = Object.freeze({
  free: Object.freeze({
    key: 'free', label: 'Free', description: 'Explore the core booking workflow.',
    limits: Object.freeze({ staff: 2, services: 5, monthlyBookings: 50, monthlyAiRequests: 10, activeOffers: 2 }),
    features: Object.freeze({ publicBooking: true, coupons: true, aiAssistant: true, advancedAI: false, analytics: 'basic' }),
  }),
  starter: Object.freeze({
    key: 'starter', label: 'Starter', description: 'For small teams managing regular bookings.',
    limits: Object.freeze({ staff: 5, services: 20, monthlyBookings: 300, monthlyAiRequests: 100, activeOffers: 10 }),
    features: Object.freeze({ publicBooking: true, coupons: true, aiAssistant: true, advancedAI: true, analytics: 'standard' }),
  }),
  pro: Object.freeze({
    key: 'pro', label: 'Pro', description: 'Higher limits for growing appointment businesses.',
    limits: Object.freeze({ staff: 25, services: 100, monthlyBookings: 2000, monthlyAiRequests: 1000, activeOffers: 50 }),
    features: Object.freeze({ publicBooking: true, coupons: true, aiAssistant: true, advancedAI: true, analytics: 'advanced' }),
  }),
});

const SUBSCRIPTION_STATUSES = Object.freeze(['trial', 'active', 'grace_period', 'expired', 'suspended']);
const isValidPlan = (plan) => Object.prototype.hasOwnProperty.call(PLAN_CATALOG, String(plan || '').toLowerCase());
const normalizePlan = (plan) => {
  const normalized = String(plan || '').toLowerCase();
  if (normalized === 'enterprise') return 'pro'; // Preserve access semantics for legacy organizations.
  return isValidPlan(normalized) ? normalized : 'free';
};
const toValidDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const isFuture = (value, now) => {
  const date = toValidDate(value);
  return Boolean(date && date.getTime() > now.getTime());
};

function resolveSubscription(organization, now = new Date()) {
  const subscription = organization?.subscription || {};
  const plan = normalizePlan((subscription.lastUpdatedReason ? subscription.plan : null) || organization?.subscriptionPlan || subscription.plan);
  let status = SUBSCRIPTION_STATUSES.includes(subscription.status) ? subscription.status : 'active';
  const periodEndsAt = toValidDate(subscription.periodEndsAt || organization?.subscriptionExpiry);
  const trialEndsAt = toValidDate(subscription.trialEndsAt);
  const gracePeriodEndsAt = toValidDate(subscription.gracePeriodEndsAt);

  if (status === 'trial' && trialEndsAt && trialEndsAt.getTime() <= now.getTime()) {
    status = isFuture(gracePeriodEndsAt, now) ? 'grace_period' : 'expired';
  } else if (status === 'active' && periodEndsAt && periodEndsAt.getTime() <= now.getTime()) {
    status = isFuture(gracePeriodEndsAt, now) ? 'grace_period' : 'expired';
  } else if (status === 'grace_period' && gracePeriodEndsAt && gracePeriodEndsAt.getTime() <= now.getTime()) {
    status = 'expired';
  }

  const effectiveEnd = status === 'trial' ? trialEndsAt : (status === 'grace_period' ? gracePeriodEndsAt : periodEndsAt);
  const daysRemaining = effectiveEnd ? Math.max(0, Math.ceil((effectiveEnd.getTime() - now.getTime()) / 86400000)) : null;
  const planConfig = PLAN_CATALOG[plan];
  return {
    plan,
    planLabel: planConfig.label,
    status,
    isDemo: subscription.isDemo !== false,
    startedAt: toValidDate(subscription.startedAt),
    periodEndsAt,
    trialEndsAt,
    gracePeriodEndsAt,
    effectiveEnd,
    daysRemaining,
    limits: planConfig.limits,
    features: planConfig.features,
    isReadOnly: ['expired', 'suspended'].includes(status),
  };
}

function validateDemoSubscriptionPayload(payload = {}) {
  const plan = String(payload.plan || '').trim().toLowerCase();
  const status = String(payload.status || '').trim().toLowerCase();
  const reason = String(payload.reason || '').trim();
  const periodDays = payload.periodDays === undefined ? 30 : Number(payload.periodDays);
  const gracePeriodDays = payload.gracePeriodDays === undefined ? 3 : Number(payload.gracePeriodDays);
  if (!isValidPlan(plan)) return { valid: false, error: 'Plan must be free, starter, or pro.' };
  if (!SUBSCRIPTION_STATUSES.includes(status)) return { valid: false, error: `Status must be one of: ${SUBSCRIPTION_STATUSES.join(', ')}.` };
  if (!Number.isInteger(periodDays) || periodDays < 1 || periodDays > 365) return { valid: false, error: 'Period days must be a whole number from 1 to 365.' };
  if (!Number.isInteger(gracePeriodDays) || gracePeriodDays < 0 || gracePeriodDays > 30) return { valid: false, error: 'Grace period days must be a whole number from 0 to 30.' };
  if (reason.length < 8 || reason.length > 500) return { valid: false, error: 'Reason must contain 8–500 characters.' };
  return { valid: true, value: { plan, status, periodDays, gracePeriodDays, reason } };
}

module.exports = { PLAN_CATALOG, SUBSCRIPTION_STATUSES, isValidPlan, normalizePlan, resolveSubscription, validateDemoSubscriptionPayload, toValidDate };
