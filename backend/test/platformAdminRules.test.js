const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parsePagination,
  escapeRegex,
  normalizeOrganizationStatus,
  validateStatusChangePayload,
} = require('../src/utils/platformAdminRules');

test('platform admin pagination normalizes invalid values and caps page size', () => {
  assert.deepEqual(parsePagination({ page: '2', limit: '20' }), { page: 2, limit: 20, skip: 20 });
  assert.deepEqual(parsePagination({ page: '-1', limit: '500' }), { page: 1, limit: 50, skip: 0 });
  assert.deepEqual(parsePagination({}), { page: 1, limit: 10, skip: 0 });
});

test('organization status filter only accepts all, active, or suspended', () => {
  assert.deepEqual(normalizeOrganizationStatus('active'), { valid: true, value: 'active' });
  assert.deepEqual(normalizeOrganizationStatus('suspended'), { valid: true, value: 'suspended' });
  assert.deepEqual(normalizeOrganizationStatus('all'), { valid: true, value: 'all' });
  assert.equal(normalizeOrganizationStatus('deleted').valid, false);
});

test('organization search terms are escaped before becoming regular expressions', () => {
  const input = 'salon.*(test)';
  const regex = new RegExp(escapeRegex(input), 'i');
  assert.equal(regex.test('salonXYZtest'), false);
  assert.equal(regex.test('My SALON.*(TEST) business'), true);
});

test('status change requires a boolean active value and a documented reason', () => {
  assert.equal(validateStatusChangePayload({ active: false, reason: 'Policy violation ticket #123' }).valid, true);
  assert.equal(validateStatusChangePayload({ active: 'false', reason: 'Policy violation ticket #123' }).valid, false);
  assert.equal(validateStatusChangePayload({ active: false, reason: 'oops' }).valid, false);
  assert.equal(validateStatusChangePayload({ active: true, reason: 'x'.repeat(501) }).valid, false);
});

test('status change reason is trimmed and normalized before persistence', () => {
  assert.deepEqual(validateStatusChangePayload({ active: true, reason: '  approved appeal  ' }), {
    valid: true,
    value: { active: true, reason: 'approved appeal' },
  });
});
