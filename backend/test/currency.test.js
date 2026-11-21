const test = require('node:test');
const assert = require('node:assert/strict');
const { formatINR, normalizeRupeeText } = require('../src/utils/currency');

test('formatINR formats whole rupee amounts with Indian digit grouping and no unnecessary decimals', () => {
  assert.equal(formatINR(300), '₹300');
  assert.equal(formatINR(125000), '₹1,25,000');
});

test('formatINR preserves fractional rupee values to two decimal places', () => {
  assert.equal(formatINR(1250.5), '₹1,250.50');
});

test('formatINR safely handles missing or invalid numeric values', () => {
  assert.equal(formatINR(undefined), '—');
  assert.equal(formatINR('not-a-number'), '—');
});

test('normalizeRupeeText rewrites common dollar and USD amount formats for INR-based AI facts', () => {
  assert.equal(normalizeRupeeText('Revenue was $ 1,250 this month.'), 'Revenue was ₹1,250 this month.');
  assert.equal(normalizeRupeeText('Recorded spend: USD 300; next: 30 dollars; previous: 300 USD.'), 'Recorded spend: ₹300; next: ₹30; previous: ₹300.')
});
