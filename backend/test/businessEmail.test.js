const test = require('node:test');
const assert = require('node:assert/strict');
const { isBusinessEmail, isAllowedEmail, isValidEmail, isWorkEmailRequired } = require('../src/utils/businessEmail');

test('accepts a syntactically valid custom business domain', () => {
  assert.equal(isBusinessEmail('alex@northstarclinic.com'), true);
  assert.equal(isBusinessEmail('  TEAM@ExampleBusiness.co.in  '), true);
});

test('rejects common personal email providers', () => {
  for (const email of [
    'hariom@gmail.com', 'person@yahoo.co.in', 'person@outlook.com',
    'person@hotmail.com', 'person@icloud.com', 'person@proton.me',
  ]) {
    assert.equal(isBusinessEmail(email), false, `${email} should be blocked`);
  }
});

test('rejects malformed email values', () => {
  for (const email of ['', null, undefined, 'missing-at-sign', 'a@b', 'a b@example.com']) {
    assert.equal(isBusinessEmail(email), false);
  }
});


test('public showcase mode accepts valid personal email addresses by default', () => {
  const original = process.env.REQUIRE_WORK_EMAIL;
  try {
    delete process.env.REQUIRE_WORK_EMAIL;
    assert.equal(isWorkEmailRequired(), false);
    assert.equal(isAllowedEmail('hariom@gmail.com'), true);
    assert.equal(isAllowedEmail('hello@example.com'), true);
    assert.equal(isAllowedEmail('not-an-email'), false);
  } finally {
    if (original === undefined) delete process.env.REQUIRE_WORK_EMAIL;
    else process.env.REQUIRE_WORK_EMAIL = original;
  }
});

test('B2B mode can explicitly require a custom work email domain', () => {
  const original = process.env.REQUIRE_WORK_EMAIL;
  try {
    process.env.REQUIRE_WORK_EMAIL = 'true';
    assert.equal(isWorkEmailRequired(), true);
    assert.equal(isAllowedEmail('hariom@gmail.com'), false);
    assert.equal(isAllowedEmail('hariom@bookflow.example'), true);
    assert.equal(isAllowedEmail('bad-email'), false);
  } finally {
    if (original === undefined) delete process.env.REQUIRE_WORK_EMAIL;
    else process.env.REQUIRE_WORK_EMAIL = original;
  }
});

test('isValidEmail validates syntax independently from the B2B domain policy', () => {
  assert.equal(isValidEmail('  Hariom@GMAIL.com  '), true);
  assert.equal(isValidEmail('a@b'), false);
  assert.equal(isValidEmail('a b@example.com'), false);
});
