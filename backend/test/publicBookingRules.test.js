const test = require('node:test');
const assert = require('node:assert/strict');
const {
  slugifyOrganizationName,
  createOrganizationSlug,
  normalizePublicEmail,
  normalizePublicPhone,
  validatePublicBookingContact,
} = require('../src/utils/publicBookingRules');

test('organization names produce readable URL-safe slugs', () => {
  assert.equal(slugifyOrganizationName('  Hariom Salon & Wellness  '), 'hariom-salon-wellness');
  assert.equal(slugifyOrganizationName('Dr. Ásha Clinic'), 'dr-asha-clinic');
  assert.equal(slugifyOrganizationName('***'), '');
});

test('organization slug uses a stable organization-id suffix to reduce collisions', () => {
  assert.equal(createOrganizationSlug('Hariom Salon', '65ab12cd34ef56'), 'hariom-salon-34ef56');
});

test('public contact values are normalized before persistence', () => {
  assert.equal(normalizePublicEmail('  CUSTOMER@Example.COM '), 'customer@example.com');
  assert.equal(normalizePublicPhone(' +91 98765 43210 '), '+91 98765 43210');
});

test('public booking accepts phone-only or email-only contact details', () => {
  assert.equal(validatePublicBookingContact({ name: 'Amit Kumar', phone: '98765 43210' }).valid, true);
  assert.equal(validatePublicBookingContact({ name: 'Amit Kumar', email: 'amit@example.com' }).valid, true);
});

test('public booking rejects missing contact information and invalid values', () => {
  assert.equal(validatePublicBookingContact({ name: 'Amit Kumar' }).valid, false);
  assert.equal(validatePublicBookingContact({ name: 'Amit Kumar', email: 'not-an-email' }).valid, false);
  assert.equal(validatePublicBookingContact({ name: 'Amit Kumar', phone: '123' }).valid, false);
  assert.equal(validatePublicBookingContact({ name: 'A'.repeat(101), phone: '98765 43210' }).valid, false);
  assert.equal(validatePublicBookingContact({ name: 'Amit Kumar', phone: '98765 43210', notes: 'x'.repeat(501) }).valid, false);
});
