const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeOfferCode, isValidOfferCode, calculateOfferDiscount, validateOfferPayload, parseOfferDate } = require('../src/utils/offerRules');

test('coupon codes normalize to uppercase and reject invalid formats', () => {
  assert.equal(normalizeOfferCode('  first15 '), 'FIRST15');
  assert.equal(isValidOfferCode('FIRST15'), true);
  assert.equal(isValidOfferCode('bad code'), false);
  assert.equal(isValidOfferCode('A'), false);
});

test('percentage discounts calculate cents and respect the maximum discount cap', () => {
  assert.deepEqual(calculateOfferDiscount({ price: 1000, discountType: 'percentage', discountValue: 15, maxDiscountAmount: 100 }), {
    basePrice: 1000, discountAmount: 100, finalPrice: 900,
  });
  assert.deepEqual(calculateOfferDiscount({ price: 300, discountType: 'percentage', discountValue: 10 }), {
    basePrice: 300, discountAmount: 30, finalPrice: 270,
  });
});

test('fixed discounts cannot reduce the booking price below zero', () => {
  assert.deepEqual(calculateOfferDiscount({ price: 300, discountType: 'fixed', discountValue: 500 }), {
    basePrice: 300, discountAmount: 300, finalPrice: 0,
  });
});

test('offer payload validates dates, values and per-customer limits', () => {
  const result = validateOfferPayload({ name: 'First Visit', code: 'first15', discountType: 'percentage', discountValue: 15, validFrom: '2026-10-01', validUntil: '2026-11-30', maxRedemptionsPerCustomer: 1 });
  assert.equal(result.valid, true);
  assert.equal(result.value.code, 'FIRST15');
  assert.equal(validateOfferPayload({ ...result.value, validFrom: '2026-12-01', validUntil: '2026-11-01' }).valid, false);
  assert.equal(validateOfferPayload({ ...result.value, discountValue: 101 }).valid, false);
});

test('offer date-only bounds use the configured business timezone and include the full expiry date', () => {
  assert.equal(parseOfferDate('2026-10-27', false, 'Asia/Kolkata').toISOString(), '2026-10-26T18:30:00.000Z');
  assert.equal(parseOfferDate('2026-10-27', true, 'Asia/Kolkata').toISOString(), '2026-10-27T18:29:59.999Z');
});
