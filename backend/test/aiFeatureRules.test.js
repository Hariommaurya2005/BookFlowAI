const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildOfferRecommendationFallback,
  normalizeOfferRecommendations,
  buildRetentionSegments,
} = require('../src/utils/aiFeatureRules');

test('offer fallback returns three distinct capped recommendation ideas', () => {
  const recommendations = buildOfferRecommendationFallback({ averageServicePrice: 600, totalCustomers: 12 });
  assert.equal(recommendations.length, 3);
  assert.equal(recommendations[0].discountType, 'percentage');
  assert.ok(recommendations[0].maxDiscountAmount <= 150);
  assert.equal(recommendations[1].discountType, 'fixed');
  assert.match(recommendations[2].audience, /low-demand/i);
});

test('AI offer recommendations are normalized to safe discount bounds', () => {
  const [recommendation] = normalizeOfferRecommendations([{
    title: 'Too large', audience: 'Everyone', discountType: 'percentage', discountValue: 95,
    maxDiscountAmount: 9000, minimumBookingAmount: -5, rationale: 'Test rationale', guardrail: 'Use limits',
  }], 500);
  assert.equal(recommendation.discountValue, 20);
  assert.equal(recommendation.maxDiscountAmount, 300);
  assert.equal(recommendation.minimumBookingAmount, 0);
});

test('retention segments are calculated from completed visits and last visit dates', () => {
  const now = new Date('2026-10-28T12:00:00.000Z');
  const customers = [
    { _id: 'a', name: 'At risk' },
    { _id: 'b', name: 'Loyal' },
    { _id: 'c', name: 'New' },
  ];
  const completedRows = [
    { _id: 'a', completedVisits: 2, totalSpent: 600, lastVisit: new Date('2026-09-01T00:00:00.000Z') },
    { _id: 'b', completedVisits: 6, totalSpent: 1800, lastVisit: new Date('2026-10-20T00:00:00.000Z') },
  ];
  const result = buildRetentionSegments(customers, completedRows, now);
  assert.equal(result.totalCustomers, 3);
  assert.equal(result.segments.at_risk, 1);
  assert.equal(result.segments.loyal, 1);
  assert.equal(result.segments.new, 1);
  assert.equal(result.atRiskCustomers[0].name, 'At risk');
});


test('AI-generated offer text normalizes dollar amounts to INR wording', () => {
  const [recommendation] = normalizeOfferRecommendations([{
    title: 'Save $15', audience: 'New customers', discountType: 'fixed', discountValue: 100,
    maxDiscountAmount: null, minimumBookingAmount: 300, rationale: 'Get $10 off your next visit.', guardrail: 'Cap at $20.'
  }], 500);
  assert.equal(recommendation.title, 'Save ₹15');
  assert.equal(recommendation.rationale, 'Get ₹10 off your next visit.');
  assert.equal(recommendation.guardrail, 'Cap at ₹20.');
});
