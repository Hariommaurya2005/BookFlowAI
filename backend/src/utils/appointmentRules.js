const ALLOWED_APPOINTMENT_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
};

const canTransitionAppointmentStatus = (currentStatus, nextStatus) => {
  if (currentStatus === nextStatus) return true;
  return Boolean(ALLOWED_APPOINTMENT_TRANSITIONS[currentStatus]?.includes(nextStatus));
};

const getAllowedAppointmentStatuses = (currentStatus) => [
  currentStatus,
  ...(ALLOWED_APPOINTMENT_TRANSITIONS[currentStatus] || []),
];

module.exports = {
  ALLOWED_APPOINTMENT_TRANSITIONS,
  canTransitionAppointmentStatus,
  getAllowedAppointmentStatuses,
};
