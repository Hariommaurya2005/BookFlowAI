const { timeToMinutes, minutesToTime } = require('./appointmentTime');

/** Generate slots that can fit the entire service within staff working hours. */
const generateSlots = (startTime, endTime, durationMinutes) => {
  const slots = [];
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0 || start >= end) {
    return slots;
  }

  for (let current = start; current + durationMinutes <= end; current += durationMinutes) {
    slots.push(minutesToTime(current));
  }

  return slots;
};

/** Compare date-only values using UTC calendar parts to avoid timezone shifts. */
const toDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
};

const isOnLeave = (date, leaves = []) => {
  const requestedDate = toDateKey(date);
  if (!requestedDate) return false;
  return leaves.some((leave) => toDateKey(leave) === requestedDate);
};

module.exports = { generateSlots, isOnLeave };
