const { resolveSubscription, PLAN_CATALOG } = require('./subscriptionPlans');

function evaluateSubscriptionStatus(organization, now = new Date()) {
  const subscription = resolveSubscription(organization, now);
  if (subscription.status === 'expired') {
    return { allowed: false, code: 'SUBSCRIPTION_EXPIRED', message: 'This demo subscription has expired. You can still view existing records and export data, but new plan-limited actions are disabled.' };
  }
  if (subscription.status === 'suspended') {
    return { allowed: false, code: 'SUBSCRIPTION_SUSPENDED', message: 'This subscription is suspended. Contact the platform administrator.' };
  }
  return { allowed: true, warning: subscription.status === 'grace_period' ? 'Your demo subscription is in its grace period.' : null };
}

function evaluatePlanFeature(organization, feature, now = new Date()) {
  const subscription = resolveSubscription(organization, now);
  const plan = PLAN_CATALOG[subscription.plan];
  const status = evaluateSubscriptionStatus(organization, now);
  if (!status.allowed) return { ...status, subscription };
  if (feature === 'advancedAI' && !plan.features.advancedAI) {
    return { allowed: false, code: 'FEATURE_NOT_INCLUDED', message: 'This feature is available on Starter and Pro demo plans. Choose a demo plan to try it; no payment is processed.', subscription };
  }
  return { allowed: true, subscription, plan, warning: status.warning };
}

module.exports = { evaluateSubscriptionStatus, evaluatePlanFeature };
