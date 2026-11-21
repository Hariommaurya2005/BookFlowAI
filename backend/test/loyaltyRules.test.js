const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateEarnedPoints,
  getMaxRedeemablePoints,
  validateRedemption,
  EARN_POINTS_PER_100,
  MIN_REDEEM_POINTS,
  MAX_REDEMPTION_PERCENT,
} = require('../src/utils/loyaltyRules');

test('awards five points for each full 100 rupees of completed spend', () => {
  assert.equal(EARN_POINTS_PER_100, 5);
  assert.equal(calculateEarnedPoints(0), 0);
  assert.equal(calculateEarnedPoints(99), 0);
  assert.equal(calculateEarnedPoints(100), 5);
  assert.equal(calculateEarnedPoints(299), 10);
  assert.equal(calculateEarnedPoints(500), 25);
  assert.equal(calculateEarnedPoints(-100), 0);
  assert.equal(calculateEarnedPoints(Number.NaN), 0);
});

test('caps redemption at 20 percent of current payable amount and available balance', () => {
  assert.equal(MAX_REDEMPTION_PERCENT, 20);
  assert.equal(getMaxRedeemablePoints(500, 1000), 200);
  assert.equal(getMaxRedeemablePoints(50, 1000), 50);
  assert.equal(getMaxRedeemablePoints(500, 199), 39);
  assert.equal(getMaxRedeemablePoints(500, 0), 0);
});

test('requires at least 100 points and rejects requests beyond the balance', () => {
  assert.equal(MIN_REDEEM_POINTS, 100);
  assert.equal(validateRedemption({ points: 99, balance: 500, payableAmount: 1000 }).valid, false);
  assert.match(validateRedemption({ points: 100, balance: 90, payableAmount: 1000 }).error, /enough loyalty points/i);
  assert.equal(validateRedemption({ points: 100, balance: 500, payableAmount: 1000 }).valid, true);
});

test('only accepts positive whole-number redemption points', () => {
  for (const points of [0, -1, 100.5, 'abc', null]) {
    assert.equal(validateRedemption({ points, balance: 1000, payableAmount: 1000 }).valid, false);
  }
});

test('does not allow a redemption discount above the appointment cap', () => {
  const result = validateRedemption({ points: 201, balance: 500, payableAmount: 1000 });
  assert.equal(result.valid, false);
  assert.equal(result.maxRedeemable, 200);
});
