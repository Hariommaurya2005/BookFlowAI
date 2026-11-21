const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseDateOnly,
  getDayBounds,
  getDayName,
  timeToMinutes,
  calculateEndTime,
  isWithinWorkingHours,
  intervalsOverlap,
  hasAppointmentConflict,
  isSlotInPast,
  isValidTimeZone,
} = require('../src/utils/appointmentTime');
const { generateSlots, isOnLeave } = require('../src/utils/slotGenerator');

test('parseDateOnly accepts a real calendar date at UTC midnight', () => {
  const date = parseDateOnly('2028-02-29');
  assert.equal(date.toISOString(), '2028-02-29T00:00:00.000Z');
  assert.throws(() => parseDateOnly('2027-02-29'), /invalid/i);
  assert.throws(() => parseDateOnly('29-02-2028'), /YYYY-MM-DD/);
});

test('getDayBounds covers exactly one UTC calendar date', () => {
  const { start, end } = getDayBounds(parseDateOnly('2026-10-23'));
  assert.equal(start.toISOString(), '2026-10-23T00:00:00.000Z');
  assert.equal(end.toISOString(), '2026-10-23T23:59:59.999Z');
});

test('getDayName uses the requested UTC calendar date', () => {
  assert.equal(getDayName(parseDateOnly('2026-10-23')), 'Friday');
});

test('time validation rejects malformed and out-of-range values', () => {
  assert.equal(timeToMinutes('17:30'), 1050);
  assert.throws(() => timeToMinutes('5:30 PM'), /HH:MM/);
  assert.throws(() => timeToMinutes('25:00'), /HH:MM/);
});

test('calculateEndTime adds duration and rejects appointments crossing midnight', () => {
  assert.equal(calculateEndTime('17:30', 45), '18:15');
  assert.throws(() => calculateEndTime('23:30', 30), /outside the same calendar day/i);
});

test('working-hours check requires the complete appointment interval to fit', () => {
  const hours = { start: '09:00', end: '18:00' };
  assert.equal(isWithinWorkingHours('17:00', '18:00', hours), true);
  assert.equal(isWithinWorkingHours('17:30', '18:30', hours), false);
  assert.equal(isWithinWorkingHours('08:30', '09:30', hours), false);
});

test('interval overlap uses half-open intervals so adjacent appointments are allowed', () => {
  assert.equal(intervalsOverlap(600, 660, 630, 690), true);
  assert.equal(intervalsOverlap(600, 630, 630, 660), false);
  assert.equal(intervalsOverlap(660, 690, 600, 660), false);
});

test('conflict detection uses endTime rather than only appointment start time', () => {
  const existing = [{ appointmentTime: '10:00', endTime: '11:00', serviceId: { duration: 60 } }];
  assert.equal(hasAppointmentConflict(existing, '10:30', '11:00', 30), true);
  assert.equal(hasAppointmentConflict(existing, '11:00', '11:30', 30), false);
});

test('conflict detection supports legacy records that have no endTime', () => {
  const existing = [{ appointmentTime: '14:00', serviceId: { duration: 90 } }];
  assert.equal(hasAppointmentConflict(existing, '15:00', '15:30', 30), true);
});

test('slot generation does not offer a slot that cannot fit the whole service', () => {
  assert.deepEqual(generateSlots('09:00', '10:00', 30), ['09:00', '09:30']);
  assert.deepEqual(generateSlots('09:00', '09:20', 30), []);
  assert.deepEqual(generateSlots('18:00', '09:00', 30), []);
});

test('leave check compares calendar dates without local timezone assumptions', () => {
  assert.equal(isOnLeave(parseDateOnly('2026-10-23'), [new Date('2026-10-23')]), true);
  assert.equal(isOnLeave(parseDateOnly('2026-10-23'), [new Date('2026-10-24')]), false);
});


test('past-slot validation respects the organization timezone and fixed current time', () => {
  const now = new Date('2026-10-27T04:00:00.000Z'); // 09:30 in Asia/Kolkata
  assert.equal(isSlotInPast('2026-10-26', '11:00', 'Asia/Kolkata', now), true);
  assert.equal(isSlotInPast('2026-10-27', '09:00', 'Asia/Kolkata', now), true);
  assert.equal(isSlotInPast('2026-10-27', '09:30', 'Asia/Kolkata', now), true);
  assert.equal(isSlotInPast('2026-10-27', '10:00', 'Asia/Kolkata', now), false);
  assert.equal(isSlotInPast('2026-10-28', '08:00', 'Asia/Kolkata', now), false);
});

test('past-slot validation uses the organization local clock instead of UTC clock', () => {
  const now = new Date('2026-10-27T04:00:00.000Z'); // 00:00 in America/New_York (EDT may vary by date)
  assert.equal(isSlotInPast('2026-10-27', '01:00', 'America/New_York', now), false);
  assert.equal(isSlotInPast('2026-10-26', '23:00', 'America/New_York', now), true);
});


test('timezone validation accepts IANA zones and rejects unknown identifiers', () => {
  assert.equal(isValidTimeZone('Asia/Kolkata'), true);
  assert.equal(isValidTimeZone('America/New_York'), true);
  assert.equal(isValidTimeZone('Not/A_Real_Zone'), false);
  assert.equal(isValidTimeZone(''), false);
});
