const test = require('node:test');
const assert = require('node:assert/strict');
const { isAuthVersionCurrent } = require('../src/utils/authSession');

test('auth session versions accept matching versions', () => {
  assert.equal(isAuthVersionCurrent(3, 3), true);
});

test('auth session versions reject tokens issued before a password change or logout', () => {
  assert.equal(isAuthVersionCurrent(2, 3), false);
});

test('legacy tokens are compatible only with users who have not invalidated sessions', () => {
  assert.equal(isAuthVersionCurrent(undefined, 0), true);
  assert.equal(isAuthVersionCurrent(undefined, 1), false);
});

test('numeric string versions are normalized safely', () => {
  assert.equal(isAuthVersionCurrent('4', 4), true);
});
