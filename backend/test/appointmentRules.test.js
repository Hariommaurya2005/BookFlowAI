const test = require('node:test');
const assert = require('node:assert/strict');
const { canTransitionAppointmentStatus, getAllowedAppointmentStatuses } = require('../src/utils/appointmentRules');

test('pending appointments can only be confirmed or cancelled', () => {
  assert.equal(canTransitionAppointmentStatus('pending', 'confirmed'), true);
  assert.equal(canTransitionAppointmentStatus('pending', 'cancelled'), true);
  assert.equal(canTransitionAppointmentStatus('pending', 'completed'), false);
});

test('confirmed appointments can be completed, cancelled, or marked no-show', () => {
  assert.equal(canTransitionAppointmentStatus('confirmed', 'completed'), true);
  assert.equal(canTransitionAppointmentStatus('confirmed', 'cancelled'), true);
  assert.equal(canTransitionAppointmentStatus('confirmed', 'no_show'), true);
  assert.equal(canTransitionAppointmentStatus('confirmed', 'pending'), false);
});

test('terminal appointment statuses cannot be reopened through normal status updates', () => {
  for (const status of ['completed', 'cancelled', 'no_show']) {
    assert.equal(canTransitionAppointmentStatus(status, 'confirmed'), false);
    assert.deepEqual(getAllowedAppointmentStatuses(status), [status]);
  }
});

test('repeating the current status is idempotent', () => {
  assert.equal(canTransitionAppointmentStatus('confirmed', 'confirmed'), true);
});
