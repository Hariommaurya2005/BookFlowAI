const test = require('node:test');
const assert = require('node:assert/strict');
const { getZonedDateTimeInstant } = require('../src/utils/appointmentTime');
const {
  createBookingManagementToken,
  hashBookingManagementToken,
  getCancellationDecision,
  getManagementTokenExpiry,
} = require('../src/utils/bookingManagement');

test('business-local appointment time converts to an instant independent of host timezone', () => {
  assert.equal(
    getZonedDateTimeInstant('2026-10-28', '10:00', 'Asia/Kolkata').toISOString(),
    '2026-10-28T04:30:00.000Z',
  );
  assert.equal(
    getZonedDateTimeInstant('2026-10-28', '10:00', 'America/New_York').toISOString(),
    '2026-10-28T14:00:00.000Z',
  );
});

test('public booking management token is high entropy and persisted as a deterministic hash', () => {
  const token = createBookingManagementToken();
  assert.ok(token.length >= 40);
  assert.match(hashBookingManagementToken(token), /^[a-f0-9]{64}$/);
  assert.equal(hashBookingManagementToken(token), hashBookingManagementToken(token));
  assert.notEqual(hashBookingManagementToken(token), token);
});

test('cancellation outside the configured window is automatic', () => {
  const now = new Date('2026-10-27T00:00:00.000Z');
  const start = new Date('2026-10-29T00:01:00.000Z');
  assert.equal(getCancellationDecision({ appointmentStart: start, windowHours: 24, now }).disposition, 'automatic');
});

test('cancellation inside or exactly on the configured window requires approval', () => {
  const now = new Date('2026-10-27T00:00:00.000Z');
  assert.equal(getCancellationDecision({ appointmentStart: new Date('2026-10-27T12:00:00.000Z'), windowHours: 24, now }).disposition, 'approval_required');
  assert.equal(getCancellationDecision({ appointmentStart: new Date('2026-10-28T00:00:00.000Z'), windowHours: 24, now }).disposition, 'approval_required');
});

test('cancellation is not allowed after appointment start', () => {
  const now = new Date('2026-10-27T12:00:00.000Z');
  assert.equal(getCancellationDecision({ appointmentStart: new Date('2026-10-27T11:59:59.000Z'), windowHours: 24, now }).disposition, 'too_late');
});

test('booking management token expires seven days after appointment start', () => {
  const start = new Date('2026-10-28T04:30:00.000Z');
  assert.equal(getManagementTokenExpiry(start).toISOString(), '2026-11-04T04:30:00.000Z');
});
