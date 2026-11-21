const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PLAN_CATALOG, resolveSubscription, validateDemoSubscriptionPayload,
} = require('../src/utils/subscriptionPlans');
const { evaluateSubscriptionStatus, evaluatePlanFeature } = require('../src/utils/subscriptionEntitlementRules');

const date = (value) => new Date(value);

test('plan catalog defines progressively higher staff, service, booking and AI limits', () => {
  assert.ok(PLAN_CATALOG.free.limits.staff < PLAN_CATALOG.starter.limits.staff);
  assert.ok(PLAN_CATALOG.starter.limits.staff < PLAN_CATALOG.pro.limits.staff);
  assert.ok(PLAN_CATALOG.free.limits.monthlyAiRequests < PLAN_CATALOG.pro.limits.monthlyAiRequests);
});

test('legacy organization fields remain compatible with subscription plan resolution', () => {
  const subscription = resolveSubscription({ subscriptionPlan: 'starter', subscriptionExpiry: date('2027-01-01T00:00:00Z') }, date('2026-10-01T00:00:00Z'));
  assert.equal(subscription.plan, 'starter');
  assert.equal(subscription.status, 'active');
});

test('active subscription automatically moves into grace period after period end when grace date remains', () => {
  const subscription = resolveSubscription({ subscriptionPlan: 'pro', subscription: { plan: 'pro', status: 'active', periodEndsAt: date('2026-10-01T00:00:00Z'), gracePeriodEndsAt: date('2026-10-10T00:00:00Z') } }, date('2026-10-05T00:00:00Z'));
  assert.equal(subscription.status, 'grace_period');
});

test('grace period expires after grace date', () => {
  const decision = evaluateSubscriptionStatus({ subscriptionPlan: 'starter', subscription: { plan: 'starter', status: 'grace_period', gracePeriodEndsAt: date('2026-10-01T00:00:00Z') } }, date('2026-10-02T00:00:00Z'));
  assert.equal(decision.allowed, false);
  assert.equal(decision.code, 'SUBSCRIPTION_EXPIRED');
});

test('expired subscriptions are read-only for plan-limited actions', () => {
  const decision = evaluateSubscriptionStatus({ subscriptionPlan: 'pro', subscription: { plan: 'pro', status: 'expired' } });
  assert.equal(decision.allowed, false);
});

test('Free plan blocks advanced AI while Starter and Pro include it', () => {
  const free = evaluatePlanFeature({ subscriptionPlan: 'free', subscription: { plan: 'free', status: 'active' } }, 'advancedAI');
  const starter = evaluatePlanFeature({ subscriptionPlan: 'starter', subscription: { plan: 'starter', status: 'active' } }, 'advancedAI');
  assert.equal(free.allowed, false);
  assert.equal(free.code, 'FEATURE_NOT_INCLUDED');
  assert.equal(starter.allowed, true);
});

test('admin demo-subscription validation accepts a valid assignment', () => {
  const result = validateDemoSubscriptionPayload({ plan: 'starter', status: 'active', periodDays: 30, gracePeriodDays: 3, reason: 'Support approved demo plan test' });
  assert.equal(result.valid, true);
  assert.equal(result.value.plan, 'starter');
});

test('admin demo-subscription validation rejects invalid plan, date limits and missing reason', () => {
  assert.equal(validateDemoSubscriptionPayload({ plan: 'enterprise', status: 'active', reason: 'Because' }).valid, false);
  assert.equal(validateDemoSubscriptionPayload({ plan: 'pro', status: 'active', periodDays: 999, reason: 'support request approved' }).valid, false);
  assert.equal(validateDemoSubscriptionPayload({ plan: 'pro', status: 'active', reason: 'short' }).valid, false);
});

test('trial moves to expired when trial and grace dates are past', () => {
  const result = resolveSubscription({ subscriptionPlan: 'pro', subscription: { plan: 'pro', status: 'trial', trialEndsAt: date('2026-09-01T00:00:00Z'), gracePeriodEndsAt: date('2026-09-03T00:00:00Z') } }, date('2026-09-04T00:00:00Z'));
  assert.equal(result.status, 'expired');
});
