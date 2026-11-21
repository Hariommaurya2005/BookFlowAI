const test = require('node:test');
const assert = require('node:assert/strict');
const { redactSensitiveUrl } = require('../src/utils/logSanitizer');

test('redacts password reset and email verification tokens from path segments', () => {
  const url = '/api/v1/auth/reset-password/very-secret-token';
  assert.equal(redactSensitiveUrl(url), '/api/v1/auth/reset-password/[redacted]');
  assert.equal(redactSensitiveUrl('/verify-email/secret-token'), '/verify-email/[redacted]');
});

test('redacts bearer-style token query parameters without changing ordinary query values', () => {
  assert.equal(redactSensitiveUrl('/manage?token=super-secret&view=compact'), '/manage?token=[redacted]&view=compact');
  assert.equal(redactSensitiveUrl('/api/items?accessToken=abc&refreshToken=xyz'), '/api/items?accessToken=[redacted]&refreshToken=[redacted]');
});
