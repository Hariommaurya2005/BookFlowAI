const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const MINUTES_PER_DAY = 24 * 60;

const isValidTimeZone = (timeZone) => {
  if (typeof timeZone !== 'string' || !timeZone.trim()) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
};

/** Parse a calendar date as UTC midnight so date-only values don't shift by timezone. */
const parseDateOnly = (value) => {
  if (typeof value !== 'string' || !DATE_ONLY_PATTERN.test(value)) {
    throw new TypeError('Date must use YYYY-MM-DD format');
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new TypeError('Date is invalid');
  }

  return date;
};

const getDayBounds = (date) => {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
};

const getDayName = (date) =>
  ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getUTCDay()];

const timeToMinutes = (value) => {
  if (typeof value !== 'string' || !TIME_PATTERN.test(value)) {
    throw new TypeError('Time must use HH:MM format (24-hour clock)');
  }
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes >= MINUTES_PER_DAY) {
    throw new RangeError('Time is outside the same calendar day');
  }
  const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
  const remainder = (minutes % 60).toString().padStart(2, '0');
  return `${hours}:${remainder}`;
};

const calculateEndTime = (startTime, durationMinutes) => {
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw new TypeError('Service duration must be a positive number of minutes');
  }
  const endMinutes = timeToMinutes(startTime) + durationMinutes;
  return minutesToTime(endMinutes);
};

const isWithinWorkingHours = (startTime, endTime, workingHours) => {
  try {
    if (!workingHours?.start || !workingHours?.end) return false;
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    const opening = timeToMinutes(workingHours.start);
    const closing = timeToMinutes(workingHours.end);
    return start < end && start >= opening && end <= closing;
  } catch {
    return false;
  }
};

const intervalsOverlap = (startA, endA, startB, endB) =>
  startA < endB && endA > startB;

/**
 * Returns whether a requested calendar-date + local clock-time is already in the past
 * for the organization's configured IANA timezone. Appointment dates are stored as UTC
 * calendar-date keys, while appointmentTime is a business-local HH:MM value.
 */
/** Convert a business-local calendar date and HH:MM time into an instant. */
const getZonedDateTimeInstant = (dateValue, timeValue, timeZone = 'Asia/Kolkata') => {
  const dateKey = dateValue instanceof Date ? dateValue.toISOString().slice(0, 10) : dateValue;
  parseDateOnly(dateKey);
  const requestedMinutes = timeToMinutes(timeValue);
  if (!isValidTimeZone(timeZone)) throw new TypeError('Timezone must be a valid IANA timezone');

  const [year, month, day] = dateKey.split('-').map(Number);
  const hour = Math.floor(requestedMinutes / 60);
  const minute = requestedMinutes % 60;
  const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = new Date(desiredAsUtc);

  // Iteratively correct the candidate using the offset observed in the target timezone.
  // This avoids relying on the host machine's local timezone.
  for (let iteration = 0; iteration < 5; iteration += 1) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(candidate);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const observedAsUtc = Date.UTC(
      Number(values.year), Number(values.month) - 1, Number(values.day),
      Number(values.hour), Number(values.minute),
    );
    const correction = desiredAsUtc - observedAsUtc;
    if (correction === 0) break;
    candidate = new Date(candidate.getTime() + correction);
  }

  const finalParts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(candidate);
  const final = Object.fromEntries(finalParts.map((part) => [part.type, part.value]));
  if (
    Number(final.year) !== year || Number(final.month) !== month || Number(final.day) !== day
    || Number(final.hour) !== hour || Number(final.minute) !== minute
  ) {
    throw new RangeError('This local appointment time does not exist in the selected timezone');
  }
  return candidate;
};

const isSlotInPast = (dateValue, timeValue, timeZone = 'Asia/Kolkata', now = new Date()) => {
  const dateKey = dateValue instanceof Date
    ? dateValue.toISOString().slice(0, 10)
    : dateValue;
  parseDateOnly(dateKey);
  const requestedMinutes = timeToMinutes(timeValue);

  const safeTimeZone = isValidTimeZone(timeZone) ? timeZone : 'Asia/Kolkata';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: safeTimeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const localDateKey = `${values.year}-${values.month}-${values.day}`;
  const localMinutes = Number(values.hour) * 60 + Number(values.minute);

  if (dateKey < localDateKey) return true;
  if (dateKey > localDateKey) return false;
  // A slot starting in the current minute is no longer considered bookable.
  return requestedMinutes <= localMinutes;
};

/**
 * Checks a requested interval against existing same-day appointments.
 * Existing records without endTime are handled using their service duration.
 * A malformed existing record is treated conservatively as a conflict.
 */
const hasAppointmentConflict = (appointments, startTime, endTime, fallbackDuration) => {
  const requestedStart = timeToMinutes(startTime);
  const requestedEnd = timeToMinutes(endTime);

  return appointments.some((appointment) => {
    try {
      const existingStart = timeToMinutes(appointment.appointmentTime);
      let existingEnd;

      if (appointment.endTime) {
        existingEnd = timeToMinutes(appointment.endTime);
      } else {
        const duration = appointment.serviceId?.duration || fallbackDuration;
        existingEnd = timeToMinutes(calculateEndTime(appointment.appointmentTime, duration));
      }

      return intervalsOverlap(requestedStart, requestedEnd, existingStart, existingEnd);
    } catch {
      return true;
    }
  });
};

module.exports = {
  parseDateOnly,
  getDayBounds,
  getDayName,
  timeToMinutes,
  minutesToTime,
  calculateEndTime,
  isWithinWorkingHours,
  isSlotInPast,
  getZonedDateTimeInstant,
  isValidTimeZone,
  intervalsOverlap,
  hasAppointmentConflict,
};
