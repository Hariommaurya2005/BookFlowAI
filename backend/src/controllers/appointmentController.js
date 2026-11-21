const Appointment = require('../models/Appointment');
const Staff = require('../models/Staff');
const Service = require('../models/Service');
const Organization = require('../models/Organization');
const Customer = require('../models/Customer');
const { generateSlots, isOnLeave } = require('../utils/slotGenerator');
const {
  parseDateOnly,
  getDayBounds,
  getDayName,
  timeToMinutes,
  calculateEndTime,
  isWithinWorkingHours,
  hasAppointmentConflict,
  isSlotInPast,
} = require('../utils/appointmentTime');
const { canTransitionAppointmentStatus } = require('../utils/appointmentRules');
const { sendSuccess, sendError } = require('../utils/response');
const { sendAppointmentConfirmation, sendAppointmentCancellationUpdate } = require('../services/emailService');
const { getAppointmentStartInstant } = require('../utils/bookingManagement');
const { createNotification } = require('../services/notificationService');
const { awardCompletedAppointment, refundAppointmentRedemption } = require('../services/loyaltyService');

const APPOINTMENT_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];

const getDateOrRespond = (value, res) => {
  try {
    return parseDateOnly(value);
  } catch (error) {
    sendError(res, error.message, 400);
    return null;
  }
};

const getBookedAppointments = async (organizationId, staffId, date, excludeId = null) => {
  const { start, end } = getDayBounds(date);
  const query = {
    organizationId,
    staffId,
    appointmentDate: { $gte: start, $lte: end },
    status: { $ne: 'cancelled' },
  };

  if (excludeId) query._id = { $ne: excludeId };

  return Appointment.find(query)
    .select('appointmentTime endTime serviceId status')
    .populate('serviceId', 'duration');
};

const getScheduleProblem = (staff, date, startTime, endTime) => {
  if (!staff.isActive) return 'Selected staff member is inactive';
  if (isOnLeave(date, staff.leaves || [])) return 'Staff is on leave for this date';

  const dayName = getDayName(date);
  if (!(staff.workingHours?.days || []).includes(dayName)) {
    return `Staff does not work on ${dayName}`;
  }

  if (!isWithinWorkingHours(startTime, endTime, staff.workingHours)) {
    return 'Appointment must fit within staff working hours';
  }

  return null;
};

// GET available slots for staff + service + date
const getAvailableSlots = async (req, res, next) => {
  try {
    const { staffId, serviceId, date } = req.query;
    const orgId = req.organizationId;

    if (!staffId || !serviceId || !date) {
      return sendError(res, 'staffId, serviceId and date are required', 400);
    }

    const appointmentDate = getDateOrRespond(date, res);
    if (!appointmentDate) return;

    const [staff, service, organization] = await Promise.all([
      Staff.findOne({ _id: staffId, organizationId: orgId }),
      Service.findOne({ _id: serviceId, organizationId: orgId }),
      Organization.findById(orgId).select('settings.timezone'),
    ]);
    const timezone = organization?.settings?.timezone || 'Asia/Kolkata';

    if (!staff || !staff.isActive) return sendError(res, 'Active staff member not found', 404);
    if (!service || !service.isActive) return sendError(res, 'Active service not found', 404);

    if (isOnLeave(appointmentDate, staff.leaves || [])) {
      return sendSuccess(res, 'Staff on leave for this date', { slots: [] });
    }

    const dayName = getDayName(appointmentDate);
    if (!(staff.workingHours?.days || []).includes(dayName)) {
      return sendSuccess(res, 'Staff not working this day', { slots: [] });
    }

    let allSlots;
    try {
      allSlots = generateSlots(staff.workingHours.start, staff.workingHours.end, service.duration);
    } catch (error) {
      return sendError(res, 'Staff working hours are configured incorrectly', 422);
    }

    const booked = await getBookedAppointments(orgId, staffId, appointmentDate);
    const available = allSlots.filter((slot) => {
      try {
        if (isSlotInPast(appointmentDate, slot, timezone)) return false;
        const endTime = calculateEndTime(slot, service.duration);
        return !hasAppointmentConflict(booked, slot, endTime, service.duration);
      } catch {
        return false;
      }
    });

    return sendSuccess(res, 'Available slots', {
      slots: available,
      date: date,
      staffId,
      serviceId,
    });
  } catch (err) {
    return next(err);
  }
};

// Create appointment
const createAppointment = async (req, res, next) => {
  try {
    const { customerId, serviceId, staffId, appointmentDate, appointmentTime, notes } = req.body;
    const orgId = req.organizationId;

    if (!customerId || !serviceId || !staffId || !appointmentDate || !appointmentTime) {
      return sendError(res, 'customerId, serviceId, staffId, appointmentDate and appointmentTime are required', 400);
    }

    const normalizedDate = getDateOrRespond(appointmentDate, res);
    if (!normalizedDate) return;

    try {
      timeToMinutes(appointmentTime);
    } catch (error) {
      return sendError(res, error.message, 400);
    }

    const [customer, service, staff, organization] = await Promise.all([
      Customer.findOne({ _id: customerId, organizationId: orgId, isActive: true }),
      Service.findOne({ _id: serviceId, organizationId: orgId, isActive: true }),
      Staff.findOne({ _id: staffId, organizationId: orgId, isActive: true }),
      Organization.findById(orgId).select('settings.timezone'),
    ]);
    const timezone = organization?.settings?.timezone || 'Asia/Kolkata';

    if (!customer) return sendError(res, 'Active customer not found', 404);
    if (!service) return sendError(res, 'Active service not found', 404);
    if (!staff) return sendError(res, 'Active staff member not found', 404);

    let endTime;
    try {
      endTime = calculateEndTime(appointmentTime, service.duration);
    } catch (error) {
      return sendError(res, error.message, 400);
    }

    if (isSlotInPast(normalizedDate, appointmentTime, timezone)) {
      return sendError(res, 'Appointments must be booked for a future date and time', 422);
    }

    const scheduleProblem = getScheduleProblem(staff, normalizedDate, appointmentTime, endTime);
    if (scheduleProblem) return sendError(res, scheduleProblem, 422);

    const booked = await getBookedAppointments(orgId, staffId, normalizedDate);
    if (hasAppointmentConflict(booked, appointmentTime, endTime, service.duration)) {
      return sendError(res, 'This time overlaps an existing appointment', 409);
    }

    // Keep appointmentDate as a consistent UTC calendar date; appointmentTime is stored separately.
    const appointment = await Appointment.create({
      organizationId: orgId,
      customerId,
      serviceId,
      staffId,
      appointmentDate: normalizedDate,
      appointmentTime,
      endTime,
      notes,
      price: service.price,
      status: 'confirmed',
      createdBy: req.user._id,
    });

    // totalBookings counts created bookings. lastVisit is updated only when a visit is completed.
    await Customer.findOneAndUpdate(
      { _id: customerId, organizationId: orgId },
      { $inc: { totalBookings: 1 } }
    );

    const populated = await appointment.populate([
      { path: 'customerId', select: 'name email phone' },
      { path: 'serviceId', select: 'name duration price' },
      { path: 'staffId', select: 'name specialization' },
    ]);

    if (customer.email) {
      try {
        await sendAppointmentConfirmation(appointment, customer, service, staff);
      } catch (error) {
        // Email delivery must not roll back a valid booking; the error is handled by the email service logger.
      }
    }

    await createNotification({
      organizationId: orgId,
      userId: req.user._id,
      title: 'New Appointment',
      message: `Appointment booked for ${customer.name} on ${normalizedDate.toISOString().slice(0, 10)}`,
      type: 'appointment',
    });

    const io = req.app.get('io');
    if (io) io.to(orgId.toString()).emit('appointment:created', populated);

    return sendSuccess(res, 'Appointment created successfully', populated, 201);
  } catch (err) {
    return next(err);
  }
};

// Get all appointments
const getAppointments = async (req, res, next) => {
  try {
    const { status, date, staffId, customerId } = req.query;
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const orgId = req.organizationId;
    const query = { organizationId: orgId };

    if (status) {
      if (!APPOINTMENT_STATUSES.includes(status)) return sendError(res, 'Invalid appointment status', 400);
      query.status = status;
    }
    if (staffId) query.staffId = staffId;
    if (customerId) query.customerId = customerId;
    if (date) {
      const parsedDate = getDateOrRespond(date, res);
      if (!parsedDate) return;
      const { start, end } = getDayBounds(parsedDate);
      query.appointmentDate = { $gte: start, $lte: end };
    }

    const skip = (page - 1) * limit;
    const [appointments, total] = await Promise.all([
      Appointment.find(query)
        .populate('customerId', 'name email phone')
        .populate('serviceId', 'name duration price')
        .populate('staffId', 'name specialization')
        .sort({ appointmentDate: -1, appointmentTime: -1 })
        .skip(skip)
        .limit(limit),
      Appointment.countDocuments(query),
    ]);

    return sendSuccess(res, 'Appointments retrieved', appointments, 200, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    return next(err);
  }
};

// Update appointment status
const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const orgId = req.organizationId;

    if (!APPOINTMENT_STATUSES.includes(status)) {
      return sendError(res, `Invalid status. Allowed values: ${APPOINTMENT_STATUSES.join(', ')}`, 400);
    }

    const appointment = await Appointment.findOne({ _id: id, organizationId: orgId });
    if (!appointment) return sendError(res, 'Appointment not found', 404);
    if (!canTransitionAppointmentStatus(appointment.status, status)) {
      return sendError(res, `Cannot change appointment status from ${appointment.status} to ${status}`, 409);
    }

    const previousStatus = appointment.status;
    if (previousStatus !== status) {
      appointment.status = status;
      if (status === 'cancelled' && appointment.cancellationRequestStatus === 'pending') {
        appointment.cancellationRequestStatus = 'approved';
        appointment.cancellationReviewedAt = new Date();
        appointment.cancellationReviewedBy = req.user._id;
        appointment.cancellationReviewNote = 'Approved by a business user through appointment status controls.';
      }
      await appointment.save();
    }
    await appointment.populate(['customerId', 'serviceId', 'staffId']);

    if (status === 'completed') {
      await Customer.findOneAndUpdate(
        { _id: appointment.customerId._id || appointment.customerId, organizationId: orgId },
        { $max: { lastVisit: appointment.appointmentDate } }
      );
      await awardCompletedAppointment(appointment, req.user._id);
    } else if (status === 'cancelled') {
      await refundAppointmentRedemption(appointment);
    }

    const io = req.app.get('io');
    if (io) io.to(orgId.toString()).emit('appointment:updated', appointment);

    return sendSuccess(res, 'Appointment updated', appointment);
  } catch (err) {
    return next(err);
  }
};

// Reschedule appointment
const rescheduleAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { appointmentDate, appointmentTime } = req.body;
    const orgId = req.organizationId;

    if (!appointmentDate || !appointmentTime) {
      return sendError(res, 'appointmentDate and appointmentTime are required', 400);
    }

    const normalizedDate = getDateOrRespond(appointmentDate, res);
    if (!normalizedDate) return;

    let requestedEndTime;
    try {
      timeToMinutes(appointmentTime);
    } catch (error) {
      return sendError(res, error.message, 400);
    }

    const appointment = await Appointment.findOne({ _id: id, organizationId: orgId });
    if (!appointment) return sendError(res, 'Appointment not found', 404);
    if (['cancelled', 'completed', 'no_show'].includes(appointment.status)) {
      return sendError(res, `A ${appointment.status} appointment cannot be rescheduled`, 409);
    }

    const [service, staff, organization] = await Promise.all([
      Service.findOne({ _id: appointment.serviceId, organizationId: orgId, isActive: true }),
      Staff.findOne({ _id: appointment.staffId, organizationId: orgId, isActive: true }),
      Organization.findById(orgId).select('settings.timezone'),
    ]);
    const timezone = organization?.settings?.timezone || 'Asia/Kolkata';

    if (!service) return sendError(res, 'Active service not found for this appointment', 404);
    if (!staff) return sendError(res, 'Active staff member not found for this appointment', 404);

    try {
      requestedEndTime = calculateEndTime(appointmentTime, service.duration);
    } catch (error) {
      return sendError(res, error.message, 400);
    }

    if (isSlotInPast(normalizedDate, appointmentTime, timezone)) {
      return sendError(res, 'Appointments must be rescheduled to a future date and time', 422);
    }

    const scheduleProblem = getScheduleProblem(staff, normalizedDate, appointmentTime, requestedEndTime);
    if (scheduleProblem) return sendError(res, scheduleProblem, 422);

    const booked = await getBookedAppointments(orgId, appointment.staffId, normalizedDate, appointment._id);
    if (hasAppointmentConflict(booked, appointmentTime, requestedEndTime, service.duration)) {
      return sendError(res, 'The new time overlaps an existing appointment', 409);
    }

    appointment.appointmentDate = normalizedDate;
    appointment.appointmentTime = appointmentTime;
    appointment.endTime = requestedEndTime;
    await appointment.save();

    const populated = await appointment.populate([
      { path: 'customerId', select: 'name email phone' },
      { path: 'serviceId', select: 'name duration price' },
      { path: 'staffId', select: 'name specialization' },
    ]);

    const io = req.app.get('io');
    if (io) io.to(orgId.toString()).emit('appointment:updated', populated);

    return sendSuccess(res, 'Appointment rescheduled', populated);
  } catch (err) {
    return next(err);
  }
};

const decideCancellationRequest = async (req, res, next) => {
  try {
    const action = String(req.body?.action || '').toLowerCase();
    const reviewNote = typeof req.body?.note === 'string' ? req.body.note.trim() : '';
    if (!['approve', 'reject'].includes(action)) {
      return sendError(res, 'action must be either approve or reject.', 400);
    }
    if (reviewNote.length > 500) return sendError(res, 'Review note must be 500 characters or fewer.', 400);

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
      cancellationRequestStatus: 'pending',
    }).populate([
      { path: 'customerId', select: 'name email phone' },
      { path: 'serviceId', select: 'name duration price' },
      { path: 'staffId', select: 'name' },
    ]);
    if (!appointment) return sendError(res, 'No pending cancellation request was found for this appointment.', 404);
    if (['cancelled', 'completed', 'no_show'].includes(appointment.status)) {
      return sendError(res, 'This appointment can no longer be reviewed as a cancellation request.', 409);
    }

    if (action === 'approve') {
      const organization = await Organization.findById(req.organizationId).select('settings.timezone');
      const startInstant = getAppointmentStartInstant(appointment, organization?.settings?.timezone || 'Asia/Kolkata');
      if (startInstant <= new Date()) {
        return sendError(res, 'The appointment has already started or passed. Do not auto-cancel it through this request.', 409);
      }
      appointment.status = 'cancelled';
      appointment.cancellationRequestStatus = 'approved';
    } else {
      appointment.cancellationRequestStatus = 'rejected';
    }
    appointment.cancellationReviewedAt = new Date();
    appointment.cancellationReviewedBy = req.user._id;
    appointment.cancellationReviewNote = reviewNote;
    await appointment.save();
    if (action === 'approve') await refundAppointmentRedemption(appointment);

    const io = req.app.get('io');
    if (io) io.to(req.organizationId.toString()).emit('appointment:updated', appointment);

    if (appointment.customerId?.email) {
      const statusText = action === 'approve'
        ? 'The business approved your cancellation request. Your appointment is cancelled.'
        : `The business could not approve your cancellation request. Your appointment remains ${appointment.status}.`;
      try {
        await sendAppointmentCancellationUpdate(appointment, appointment.customerId, appointment.serviceId, statusText);
      } catch (error) {
        // The status change is already saved; email failure should not roll it back.
      }
    }

    return sendSuccess(res, action === 'approve' ? 'Cancellation request approved.' : 'Cancellation request rejected.', appointment);
  } catch (error) {
    return next(error);
  }
};

const deleteAppointment = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, organizationId: orgId, status: { $ne: 'cancelled' } },
      { $set: { status: 'cancelled' } },
      { new: true, runValidators: true }
    ).populate(['customerId', 'serviceId', 'staffId']);

    if (!appointment) return sendError(res, 'Active appointment not found', 404);
    await refundAppointmentRedemption(appointment);

    const io = req.app.get('io');
    if (io) io.to(orgId.toString()).emit('appointment:updated', appointment);

    return sendSuccess(res, 'Appointment cancelled', appointment);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getAvailableSlots,
  createAppointment,
  getAppointments,
  updateAppointmentStatus,
  rescheduleAppointment,
  decideCancellationRequest,
  deleteAppointment,
};
