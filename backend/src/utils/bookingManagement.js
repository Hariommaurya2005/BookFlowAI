const crypto = require('crypto');
const { getZonedDateTimeInstant } = require('./appointmentTime');

const DEFAULT_CANCELLATION_WINDOW_HOURS = 24;
const MANAGEMENT_LINK_GRACE_DAYS = 7;

const createBookingManagementToken = () => crypto.randomBytes(32).toString('base64url');
const hashBookingManagementToken = (token) =>
  crypto.createHash('sha256').update(String(token || '')).digest('hex');

const getAppointmentStartInstant = (appointment, timeZone = 'Asia/Kolkata') => {
  const dateKey = appointment.appointmentDate instanceof Date
    ? appointment.appointmentDate.toISOString().slice(0, 10)
    : String(appointment.appointmentDate || '').slice(0, 10);
  return getZonedDateTimeInstant(dateKey, appointment.appointmentTime, timeZone);
};

const getCancellationDecision = ({ appointmentStart, windowHours = DEFAULT_CANCELLATION_WINDOW_HOURS, now = new Date() }) => {
  const startMs = new Date(appointmentStart).getTime();
  const nowMs = new Date(now).getTime();
  const hours = Number(windowHours);
  if (!Number.isFinite(startMs) || !Number.isFinite(nowMs)) throw new TypeError('Valid appointment start and current time are required');
  if (!Number.isFinite(hours) || hours < 1 || hours > 720) throw new RangeError('Cancellation window must be between 1 and 720 hours');
  const millisecondsUntilStart = startMs - nowMs;
  if (millisecondsUntilStart <= 0) {
    return { disposition: 'too_late', hoursUntilStart: 0 };
  }
  const hoursUntilStart = millisecondsUntilStart / (60 * 60 * 1000);
  return {
    disposition: hoursUntilStart > hours ? 'automatic' : 'approval_required',
    hoursUntilStart: Number(hoursUntilStart.toFixed(2)),
  };
};

const getManagementTokenExpiry = (appointmentStart) =>
  new Date(new Date(appointmentStart).getTime() + MANAGEMENT_LINK_GRACE_DAYS * 24 * 60 * 60 * 1000);

module.exports = {
  DEFAULT_CANCELLATION_WINDOW_HOURS,
  createBookingManagementToken,
  hashBookingManagementToken,
  getAppointmentStartInstant,
  getCancellationDecision,
  getManagementTokenExpiry,
};
