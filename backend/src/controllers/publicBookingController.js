const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const Service = require('../models/Service');
const Staff = require('../models/Staff');
const Customer = require('../models/Customer');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Offer = require('../models/Offer');
const { evaluateOffer, reserveOfferRedemption, releaseOfferRedemption } = require('../services/offerService');
const { generateSlots, isOnLeave } = require('../utils/slotGenerator');
const {
  parseDateOnly,
  getDayBounds,
  getDayName,
  calculateEndTime,
  isWithinWorkingHours,
  hasAppointmentConflict,
  isSlotInPast,
  timeToMinutes,
} = require('../utils/appointmentTime');
const { validatePublicBookingContact, normalizePublicEmail, normalizePublicPhone } = require('../utils/publicBookingRules');
const { sendSuccess, sendError } = require('../utils/response');
const { sendAppointmentConfirmation } = require('../services/emailService');
const logger = require('../utils/logger');
const {
  createBookingManagementToken, hashBookingManagementToken, getAppointmentStartInstant,
  getCancellationDecision, getManagementTokenExpiry, DEFAULT_CANCELLATION_WINDOW_HOURS,
} = require('../utils/bookingManagement');
const { sendAppointmentCancellationUpdate } = require('../services/emailService');
const { refundAppointmentRedemption } = require('../services/loyaltyService');
const { parsePreferencesWithAI, formatDateForTimezone } = require('./aiController');
const { getModel } = require('../services/aiService');
const { checkOrganizationEntitlement } = require('../services/subscriptionService');

const getPublicOrganization = async (slug) => {
  const normalizedSlug = String(slug || '').trim().toLowerCase();
  if (!normalizedSlug || normalizedSlug.length > 80) return null;
  return Organization.findOne({
    slug: normalizedSlug,
    active: { $ne: false },
    publicBookingEnabled: { $ne: false },
  }).select('name phone businessType logo slug settings.timezone cancellationPolicy subscriptionPlan subscriptionExpiry subscription');
};

const getSlotsForStaff = async ({ organizationId, staff, service, date, timezone }) => {
  if (!staff.isActive || isOnLeave(date, staff.leaves || [])) return [];
  const dayName = getDayName(date);
  if (!(staff.workingHours?.days || []).includes(dayName)) return [];

  let candidateSlots;
  try {
    candidateSlots = generateSlots(staff.workingHours.start, staff.workingHours.end, service.duration);
  } catch {
    return [];
  }

  const { start, end } = getDayBounds(date);
  const booked = await Appointment.find({
    organizationId,
    staffId: staff._id,
    appointmentDate: { $gte: start, $lte: end },
    status: { $nin: ['cancelled'] },
  }).select('appointmentTime endTime serviceId status').populate('serviceId', 'duration');

  return candidateSlots.filter((time) => {
    try {
      if (isSlotInPast(date, time, timezone)) return false;
      const endTime = calculateEndTime(time, service.duration);
      return isWithinWorkingHours(time, endTime, staff.workingHours)
        && !hasAppointmentConflict(booked, time, endTime, service.duration);
    } catch {
      return false;
    }
  }).map((time) => ({ time, staffId: staff._id.toString(), staffName: staff.name }));
};

const getPublicBookingPage = async (req, res, next) => {
  try {
    const organization = await getPublicOrganization(req.params.slug);
    if (!organization) return sendError(res, 'This booking page is unavailable.', 404);
    const publicEntitlement = await checkOrganizationEntitlement(organization, 'publicBooking', { consumeAI: false });
    if (!publicEntitlement.allowed) return sendError(res, publicEntitlement.message, publicEntitlement.httpStatus || 403, { code: publicEntitlement.code || 'SUBSCRIPTION_RESTRICTED' });

    const now = new Date();
    const [services, staff, publicOffers] = await Promise.all([
      Service.find({ organizationId: organization._id, isActive: true })
        .select('name description duration price currency category')
        .sort({ category: 1, name: 1 }).lean(),
      Staff.find({ organizationId: organization._id, isActive: true })
        .select('name specialization avatar workingHours.start workingHours.end workingHours.days')
        .sort({ name: 1 }).lean(),
      Offer.find({
        organizationId: organization._id, isActive: true, showOnPublicPage: true,
        validFrom: { $lte: now }, validUntil: { $gte: now },
        $or: [{ usageLimit: null }, { $expr: { $lt: ['$redemptionCount', '$usageLimit'] } }],
      }).select('name code description discountType discountValue maxDiscountAmount minimumBookingAmount serviceIds firstVisitOnly validUntil')
        .sort({ createdAt: -1 }).limit(8).lean(),
    ]);

    return sendSuccess(res, 'Public booking page retrieved', {
      organization: {
        name: organization.name,
        phone: organization.phone || '',
        businessType: organization.businessType,
        logo: organization.logo || null,
        slug: organization.slug,
        timezone: organization.settings?.timezone || 'Asia/Kolkata',
        cancellationPolicy: { windowHours: Number(organization.cancellationPolicy?.windowHours) || DEFAULT_CANCELLATION_WINDOW_HOURS },
      },
      services: services.map((service) => ({ ...service, currency: 'INR' })),
      staff,
      offers: publicOffers.map((offer) => ({ ...offer, currency: 'INR' })),
    });
  } catch (error) {
    return next(error);
  }
};

const getPublicAvailableSlots = async (req, res, next) => {
  try {
    const organization = await getPublicOrganization(req.params.slug);
    if (!organization) return sendError(res, 'This booking page is unavailable.', 404);
    const publicEntitlement = await checkOrganizationEntitlement(organization, 'publicBooking', { consumeAI: false });
    if (!publicEntitlement.allowed) return sendError(res, publicEntitlement.message, publicEntitlement.httpStatus || 403, { code: publicEntitlement.code || 'SUBSCRIPTION_RESTRICTED' });

    const { serviceId, staffId, date } = req.query;
    if (!serviceId || !date) return sendError(res, 'serviceId and date are required.', 400);
    if (!mongoose.Types.ObjectId.isValid(serviceId)) return sendError(res, 'Invalid serviceId.', 400);
    if (staffId && !mongoose.Types.ObjectId.isValid(staffId)) return sendError(res, 'Invalid staffId.', 400);

    let requestedDate;
    try { requestedDate = parseDateOnly(date); } catch (error) { return sendError(res, error.message, 400); }

    const service = await Service.findOne({ _id: serviceId, organizationId: organization._id, isActive: true })
      .select('name duration price currency');
    if (!service) return sendError(res, 'Selected service is unavailable.', 404);

    const staffQuery = { organizationId: organization._id, isActive: true };
    if (staffId) staffQuery._id = staffId;
    const staffList = await Staff.find(staffQuery)
      .select('name workingHours leaves isActive')
      .sort({ name: 1 });
    if (staffId && !staffList.length) return sendError(res, 'Selected staff member is unavailable.', 404);

    const timezone = organization.settings?.timezone || 'Asia/Kolkata';
    const groups = await Promise.all(staffList.map((staff) => getSlotsForStaff({
      organizationId: organization._id,
      staff,
      service,
      date: requestedDate,
      timezone,
    })));
    const slots = groups.flat().sort((a, b) => {
      const timeDifference = timeToMinutes(a.time) - timeToMinutes(b.time);
      return timeDifference || a.staffName.localeCompare(b.staffName);
    });

    return sendSuccess(res, 'Available slots retrieved', { date, timezone, slots });
  } catch (error) {
    return next(error);
  }
};

/** Public AI helper parses a request, then relies on the same server-side slot engine as regular booking. */
const aiSuggestPublicBooking = async (req, res, next) => {
  try {
    const organization = await getPublicOrganization(req.params.slug);
    if (!organization) return sendError(res, 'This booking page is unavailable.', 404);
    const entitlement = await checkOrganizationEntitlement(organization, 'ai');
    if (!entitlement.allowed) return sendError(res, entitlement.message, entitlement.httpStatus || 403, { code: entitlement.code || 'SUBSCRIPTION_RESTRICTED' });

    const query = String(req.body?.query || '').trim();
    const { serviceId, staffId } = req.body || {};
    if (!query || query.length > 500) return sendError(res, 'Enter a booking request between 1 and 500 characters.', 400);
    if (!serviceId || !mongoose.Types.ObjectId.isValid(serviceId)) return sendError(res, 'Select a valid service first.', 400);
    if (staffId && !mongoose.Types.ObjectId.isValid(staffId)) return sendError(res, 'Invalid staff selection.', 400);

    const service = await Service.findOne({ _id: serviceId, organizationId: organization._id, isActive: true }).select('name duration price');
    if (!service) return sendError(res, 'Selected service is unavailable.', 404);
    const timezone = organization.settings?.timezone || 'Asia/Kolkata';
    const today = formatDateForTimezone(new Date(), timezone);
    const { preferences, aiPowered } = await parsePreferencesWithAI(query, today, timezone);
    let requestedDate;
    try { requestedDate = parseDateOnly(preferences.date); }
    catch (error) { return sendError(res, error.message, 400); }

    const staffQuery = { organizationId: organization._id, isActive: true };
    if (staffId) staffQuery._id = staffId;
    const staffList = await Staff.find(staffQuery).select('name specialization workingHours leaves isActive').sort({ name: 1 });
    const slotGroups = await Promise.all(staffList.map((staffMember) => getSlotsForStaff({
      organizationId: organization._id, staff: staffMember, service, date: requestedDate, timezone,
    })));
    let candidates = slotGroups.flat();
    if (preferences.afterTime) {
      const threshold = timeToMinutes(preferences.afterTime);
      candidates = candidates.filter((slot) => timeToMinutes(slot.time) >= threshold);
    } else if (preferences.preferredTime) {
      const preferred = timeToMinutes(preferences.preferredTime);
      candidates.sort((a, b) => Math.abs(timeToMinutes(a.time) - preferred) - Math.abs(timeToMinutes(b.time) - preferred));
    } else {
      candidates.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    }
    const availableSlots = candidates.slice(0, 5);
    const dateLabel = new Date(`${preferences.date}T12:00:00.000Z`).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
    });
    return sendSuccess(res, 'Public booking suggestions', {
      date: preferences.date,
      service: { id: service._id, name: service.name, duration: service.duration, price: service.price, currency: 'INR' },
      slots: availableSlots,
      message: availableSlots.length
        ? `I found ${availableSlots.length} available time option(s) for ${service.name} on ${dateLabel}. Choose a suggestion and confirm the booking details below.`
        : `No available time slots found for ${service.name} on ${dateLabel}. Try another date or team member.`,
      aiPowered,
      aiModel: aiPowered ? getModel() : null,
      notice: aiPowered ? null : 'Using the built-in date/time parser because Groq is unavailable or not configured.',
    });
  } catch (error) { return next(error); }
};

const validatePublicCoupon = async (req, res, next) => {
  try {
    const organization = await getPublicOrganization(req.params.slug);
    if (!organization) return sendError(res, 'This booking page is unavailable.', 404);
    const { serviceId, code, email = '', phone = '' } = req.body || {};
    if (!serviceId || !mongoose.Types.ObjectId.isValid(serviceId)) return sendError(res, 'A valid service is required to check this coupon.', 400);
    const normalizedEmail = normalizePublicEmail(email);
    const normalizedPhone = normalizePublicPhone(phone);
    if (!normalizedEmail && !normalizedPhone) return sendError(res, 'Enter an email address or phone number before applying a coupon.', 400);
    if (normalizedEmail && (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))) return sendError(res, 'Enter a valid email address.', 400);
    if (normalizedPhone && (normalizedPhone.length > 25 || !/^[0-9+().\-\s]{7,25}$/.test(normalizedPhone))) return sendError(res, 'Enter a valid phone number.', 400);

    const service = await Service.findOne({ _id: serviceId, organizationId: organization._id, isActive: true }).select('name price duration currency');
    if (!service) return sendError(res, 'Selected service is unavailable.', 404);
    const evaluation = await evaluateOffer({
      organizationId: organization._id,
      service,
      code,
      email: normalizedEmail,
      phone: normalizedPhone,
    });
    return sendSuccess(res, 'Coupon applied successfully.', {
      coupon: { id: evaluation.offer._id, code: evaluation.offer.code, name: evaluation.offer.name, discountType: evaluation.offer.discountType, discountValue: evaluation.offer.discountValue },
      basePrice: evaluation.basePrice,
      discountAmount: evaluation.discountAmount,
      finalPrice: evaluation.finalPrice,
      currency: 'INR',
    });
  } catch (error) {
    if (error.statusCode) return sendError(res, error.message, error.statusCode);
    return next(error);
  }
};

const createPublicAppointment = async (req, res, next) => {
  try {
    const organization = await getPublicOrganization(req.params.slug);
    if (!organization) return sendError(res, 'This booking page is unavailable.', 404);
    const bookingEntitlement = await checkOrganizationEntitlement(organization, 'booking');
    if (!bookingEntitlement.allowed) return sendError(res, bookingEntitlement.message, bookingEntitlement.httpStatus || 403, { code: bookingEntitlement.code || 'SUBSCRIPTION_RESTRICTED' });

    const contact = validatePublicBookingContact(req.body || {});
    if (!contact.valid) return sendError(res, contact.errors.join(' '), 400);

    const { serviceId, staffId, appointmentDate, appointmentTime } = req.body || {};
    const requestedCouponCode = String(req.body?.couponCode || '').trim().toUpperCase();
    if (!serviceId || !staffId || !appointmentDate || !appointmentTime) {
      return sendError(res, 'Service, staff, date and time are required.', 400);
    }
    if (!mongoose.Types.ObjectId.isValid(serviceId) || !mongoose.Types.ObjectId.isValid(staffId)) {
      return sendError(res, 'Invalid service or staff selection.', 400);
    }

    let normalizedDate;
    try {
      normalizedDate = parseDateOnly(appointmentDate);
      timeToMinutes(appointmentTime);
    } catch (error) {
      return sendError(res, error.message, 400);
    }

    const [service, staff] = await Promise.all([
      Service.findOne({ _id: serviceId, organizationId: organization._id, isActive: true }),
      Staff.findOne({ _id: staffId, organizationId: organization._id, isActive: true }),
    ]);
    if (!service) return sendError(res, 'Selected service is unavailable.', 404);
    if (!staff) return sendError(res, 'Selected staff member is unavailable.', 404);

    const timezone = organization.settings?.timezone || 'Asia/Kolkata';
    if (isSlotInPast(normalizedDate, appointmentTime, timezone)) {
      return sendError(res, 'Please choose a future date and time.', 422);
    }

    let endTime;
    try { endTime = calculateEndTime(appointmentTime, service.duration); }
    catch (error) { return sendError(res, error.message, 400); }
    if (isOnLeave(normalizedDate, staff.leaves || [])) return sendError(res, 'Staff is on leave for this date.', 409);
    if (!(staff.workingHours?.days || []).includes(getDayName(normalizedDate))) {
      return sendError(res, 'Staff does not work on the selected day.', 409);
    }
    if (!isWithinWorkingHours(appointmentTime, endTime, staff.workingHours)) {
      return sendError(res, 'Selected time is outside staff working hours.', 409);
    }

    const { start, end } = getDayBounds(normalizedDate);
    const booked = await Appointment.find({
      organizationId: organization._id,
      staffId: staff._id,
      appointmentDate: { $gte: start, $lte: end },
      status: { $nin: ['cancelled'] },
    }).select('appointmentTime endTime serviceId status').populate('serviceId', 'duration');
    if (hasAppointmentConflict(booked, appointmentTime, endTime, service.duration)) {
      return sendError(res, 'That time was just booked. Please select another available slot.', 409);
    }

    let appointmentStart;
    try {
      appointmentStart = getAppointmentStartInstant({ appointmentDate: normalizedDate, appointmentTime }, timezone);
    } catch (error) {
      return sendError(res, error.message || 'The selected local time is invalid.', 422);
    }
    const managementToken = createBookingManagementToken();
    const managementTokenHash = hashBookingManagementToken(managementToken);
    const managementTokenExpiresAt = getManagementTokenExpiry(appointmentStart);
    const frontendUrl = String(process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const managementUrl = `${frontendUrl}/booking/manage#${managementToken}`;

    const email = normalizePublicEmail(contact.value.email);
    const phone = normalizePublicPhone(contact.value.phone);
    const customerQueryConditions = [];
    if (email) customerQueryConditions.push({ email });
    if (phone) customerQueryConditions.push({ phone });

    let customer = null;
    if (customerQueryConditions.length) {
      const matches = await Customer.find({
        organizationId: organization._id,
        $or: customerQueryConditions,
      }).limit(3);

      const uniqueMatches = new Map(matches.map((match) => [match._id.toString(), match]));
      if (uniqueMatches.size > 1) {
        return sendError(res, 'These contact details match different customer records. Please contact the business to complete the booking.', 409);
      }
      customer = uniqueMatches.values().next().value || null;
      if (customer && !customer.isActive) {
        return sendError(res, 'These contact details are linked to an inactive customer record. Please contact the business to book.', 409);
      }
    }

    let couponEvaluation = null;
    if (requestedCouponCode) {
      try {
        couponEvaluation = await evaluateOffer({
          organizationId: organization._id,
          service,
          code: requestedCouponCode,
          email,
          phone,
          customer,
        });
      } catch (error) {
        return sendError(res, error.message, error.statusCode || 400);
      }
    }

    let createdCustomer = false;
    if (!customer) {
      customer = await Customer.create({
        organizationId: organization._id,
        name: contact.value.name,
        email: email || undefined,
        phone: phone || undefined,
        notes: '',
        totalBookings: 0,
        isActive: true,
      });
      createdCustomer = true;
    }

    let appointment;
    try {
      // Re-read conflicts immediately before insert to reduce the stale-slot window.
      const latestBooked = await Appointment.find({
        organizationId: organization._id,
        staffId: staff._id,
        appointmentDate: { $gte: start, $lte: end },
        status: { $nin: ['cancelled'] },
      }).select('appointmentTime endTime serviceId status').populate('serviceId', 'duration');
      if (hasAppointmentConflict(latestBooked, appointmentTime, endTime, service.duration)) {
        if (createdCustomer) await Customer.findByIdAndDelete(customer._id);
        return sendError(res, 'That time was just booked. Please select another available slot.', 409);
      }

      let redemptionReserved = false;
      if (couponEvaluation) {
        const reserved = await reserveOfferRedemption({
          offerId: couponEvaluation.offer._id,
          organizationId: organization._id,
          usageLimit: couponEvaluation.offer.usageLimit,
        });
        if (!reserved) {
          if (createdCustomer) await Customer.findByIdAndDelete(customer._id);
          return sendError(res, 'This coupon has just reached its usage limit. Please try another code.', 409);
        }
        redemptionReserved = true;
      }

      try {
        appointment = await Appointment.create({
          organizationId: organization._id,
          customerId: customer._id,
          serviceId: service._id,
          staffId: staff._id,
          appointmentDate: normalizedDate,
          appointmentTime,
          endTime,
          notes: contact.value.notes,
          price: couponEvaluation ? couponEvaluation.finalPrice : service.price,
          basePrice: service.price,
          discountAmount: couponEvaluation ? couponEvaluation.discountAmount : 0,
          offerId: couponEvaluation?.offer._id || null,
          couponCode: couponEvaluation?.offer.code || null,
          status: 'confirmed',
          bookingManagementTokenHash: managementTokenHash,
          bookingManagementTokenExpiresAt: managementTokenExpiresAt,
        });
      } catch (error) {
        if (redemptionReserved) await releaseOfferRedemption({ offerId: couponEvaluation.offer._id, organizationId: organization._id }).catch(() => {});
        throw error;
      }
    } catch (error) {
      if (createdCustomer) await Customer.findByIdAndDelete(customer._id).catch(() => {});
      throw error;
    }

    await Customer.findOneAndUpdate(
      { _id: customer._id, organizationId: organization._id },
      { $inc: { totalBookings: 1 } }
    );

    const populated = await appointment.populate([
      { path: 'customerId', select: 'name email phone' },
      { path: 'serviceId', select: 'name duration price currency' },
      { path: 'staffId', select: 'name specialization' },
    ]);

    if (email) {
      try {
        await sendAppointmentConfirmation(populated, populated.customerId, populated.serviceId, populated.staffId, { managementUrl });
      } catch (error) {
        logger.warn(`Public booking confirmation email was not sent: ${error.message}`);
      }
    }

    try {
      const recipients = await User.find({
        organizationId: organization._id,
        isActive: true,
        role: { $in: ['business_owner', 'receptionist'] },
      }).select('_id').limit(100).lean();
      if (recipients.length) {
        await Notification.insertMany(recipients.map((recipient) => ({
          organizationId: organization._id,
          userId: recipient._id,
          title: 'New online booking',
          message: `${contact.value.name} booked ${service.name} for ${appointmentDate} at ${appointmentTime}.`,
          type: 'appointment',
          link: '/appointments',
        })));
      }
    } catch (error) {
      logger.warn(`Public booking notification creation failed: ${error.message}`);
    }

    const io = req.app.get('io');
    if (io) io.to(organization._id.toString()).emit('appointment:created', { _id: appointment._id, status: appointment.status });

    return sendSuccess(res, 'Appointment booked successfully.', {
      booking: {
        id: appointment._id,
        date: appointmentDate,
        time: appointmentTime,
        endTime,
        status: appointment.status,
        price: appointment.price,
        basePrice: service.price,
        discountAmount: appointment.discountAmount || 0,
        couponCode: appointment.couponCode || null,
        currency: 'INR',
        customerName: contact.value.name,
        serviceName: service.name,
        staffName: staff.name,
        businessName: organization.name,
        managementUrl,
      },
      emailConfirmationAttempted: Boolean(email),
    }, 201);
  } catch (error) {
    return next(error);
  }
};

const findManagedAppointment = async (req) => {
  const token = String(req.get('x-booking-management-token') || '').trim();
  if (token.length < 40 || token.length > 200) return { error: 'missing_or_invalid_token' };
  const tokenHash = hashBookingManagementToken(token);
  const appointment = await Appointment.findOne({ bookingManagementTokenHash: tokenHash })
    .populate({ path: 'organizationId', select: 'name settings.timezone cancellationPolicy' })
    .populate({ path: 'customerId', select: 'name email phone' })
    .populate({ path: 'serviceId', select: 'name duration price' })
    .populate({ path: 'staffId', select: 'name' });
  if (!appointment) return { error: 'not_found' };
  if (!appointment.bookingManagementTokenExpiresAt || appointment.bookingManagementTokenExpiresAt <= new Date()) {
    return { error: 'expired' };
  }
  return { appointment, token };
};

const getPublicBookingManagement = async (req, res, next) => {
  try {
    const result = await findManagedAppointment(req);
    if (result.error === 'missing_or_invalid_token') return sendError(res, 'A valid booking management link is required.', 401);
    if (result.error === 'expired') return sendError(res, 'This booking management link has expired.', 410);
    if (result.error) return sendError(res, 'Booking not found. Check that you opened the complete management link.', 404);

    const { appointment } = result;
    const organization = appointment.organizationId;
    const timezone = organization?.settings?.timezone || 'Asia/Kolkata';
    const windowHours = Number(organization?.cancellationPolicy?.windowHours) || DEFAULT_CANCELLATION_WINDOW_HOURS;
    const startInstant = getAppointmentStartInstant(appointment, timezone);
    const decision = getCancellationDecision({ appointmentStart: startInstant, windowHours });
    const terminalStatus = ['cancelled', 'completed', 'no_show'].includes(appointment.status);
    const canRequestCancellation = !terminalStatus
      && decision.disposition !== 'too_late'
      && appointment.cancellationRequestStatus !== 'pending';

    return sendSuccess(res, 'Booking details retrieved', {
      booking: {
        id: appointment._id,
        businessName: organization?.name || 'Business',
        customerName: appointment.customerId?.name || 'Customer',
        serviceName: appointment.serviceId?.name || 'Service',
        staffName: appointment.staffId?.name || 'Team member',
        date: appointment.appointmentDate.toISOString().slice(0, 10),
        time: appointment.appointmentTime,
        endTime: appointment.endTime || null,
        price: appointment.price,
        basePrice: appointment.basePrice ?? appointment.price,
        discountAmount: appointment.discountAmount || 0,
        couponCode: appointment.couponCode || null,
        currency: 'INR',
        status: appointment.status,
        cancellationRequestStatus: appointment.cancellationRequestStatus || 'none',
        cancellationRequestedAt: appointment.cancellationRequestedAt || null,
        cancellationRequestReason: appointment.cancellationRequestReason || '',
      },
      cancellationPolicy: {
        windowHours,
        disposition: decision.disposition,
        hoursUntilStart: decision.hoursUntilStart,
        canRequestCancellation,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const notifyOrganizationAboutCancellation = async ({ organizationId, customerName, serviceName, date, time, pendingApproval }) => {
  try {
    const recipients = await User.find({
      organizationId,
      isActive: true,
      role: { $in: ['business_owner', 'receptionist'] },
    }).select('_id').limit(100).lean();
    if (!recipients.length) return;
    const title = pendingApproval ? 'Appointment cancellation requested' : 'Online appointment cancelled';
    const message = pendingApproval
      ? `${customerName} requested cancellation of ${serviceName} on ${date} at ${time}. Review it in Appointments.`
      : `${customerName}'s appointment for ${serviceName} on ${date} at ${time} was cancelled under the business policy.`;
    await Notification.insertMany(recipients.map((recipient) => ({
      organizationId,
      userId: recipient._id,
      title,
      message,
      type: pendingApproval ? 'alert' : 'appointment',
      link: '/appointments',
    })));
  } catch (error) {
    logger.warn(`Cancellation notification creation failed: ${error.message}`);
  }
};

const requestPublicCancellation = async (req, res, next) => {
  try {
    const result = await findManagedAppointment(req);
    if (result.error === 'missing_or_invalid_token') return sendError(res, 'A valid booking management link is required.', 401);
    if (result.error === 'expired') return sendError(res, 'This booking management link has expired.', 410);
    if (result.error) return sendError(res, 'Booking not found. Check that you opened the complete management link.', 404);

    const { appointment, token } = result;
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (reason.length > 500) return sendError(res, 'Cancellation reason must be 500 characters or fewer.', 400);
    if (['cancelled', 'completed', 'no_show'].includes(appointment.status)) {
      return sendError(res, `This appointment is already ${appointment.status.replace('_', ' ')} and cannot be cancelled again.`, 409);
    }
    if (appointment.cancellationRequestStatus === 'pending') {
      return sendError(res, 'A cancellation request is already waiting for the business to review it.', 409);
    }

    const organization = appointment.organizationId;
    const timezone = organization?.settings?.timezone || 'Asia/Kolkata';
    const windowHours = Number(organization?.cancellationPolicy?.windowHours) || DEFAULT_CANCELLATION_WINDOW_HOURS;
    const startInstant = getAppointmentStartInstant(appointment, timezone);
    const decision = getCancellationDecision({ appointmentStart: startInstant, windowHours });
    if (decision.disposition === 'too_late') {
      return sendError(res, 'This appointment has already started or passed. Please contact the business for help.', 409);
    }

    const now = new Date();
    const automatic = decision.disposition === 'automatic';
    appointment.cancellationRequestedAt = now;
    appointment.cancellationRequestReason = reason;
    appointment.cancellationReviewedAt = automatic ? now : null;
    appointment.cancellationReviewedBy = null;
    appointment.cancellationReviewNote = automatic
      ? `Automatically approved because the cancellation was requested more than ${windowHours} hours before the appointment.`
      : '';
    appointment.cancellationRequestStatus = automatic ? 'approved' : 'pending';
    if (automatic) appointment.status = 'cancelled';
    await appointment.save();
    if (automatic) await refundAppointmentRedemption(appointment);

    await notifyOrganizationAboutCancellation({
      organizationId: organization._id,
      customerName: appointment.customerId?.name || 'A customer',
      serviceName: appointment.serviceId?.name || 'appointment',
      date: appointment.appointmentDate.toISOString().slice(0, 10),
      time: appointment.appointmentTime,
      pendingApproval: !automatic,
    });

    const io = req.app.get('io');
    if (io) io.to(organization._id.toString()).emit('appointment:updated', appointment);

    if (appointment.customerId?.email) {
      const frontendUrl = String(process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
      const managementUrl = `${frontendUrl}/booking/manage#${token}`;
      const statusText = automatic
        ? 'Your appointment cancellation has been confirmed.'
        : 'Your cancellation request has been sent to the business. The appointment remains scheduled until the business reviews it.';
      try {
        await sendAppointmentCancellationUpdate(appointment, appointment.customerId, appointment.serviceId, statusText, managementUrl);
      } catch (error) {
        logger.warn(`Cancellation update email was not sent: ${error.message}`);
      }
    }

    return sendSuccess(res, automatic ? 'Appointment cancelled successfully.' : 'Cancellation request sent for business approval.', {
      status: appointment.status,
      cancellationRequestStatus: appointment.cancellationRequestStatus,
      disposition: automatic ? 'cancelled' : 'pending_approval',
      windowHours,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getPublicBookingPage,
  getPublicAvailableSlots,
  aiSuggestPublicBooking,
  validatePublicCoupon,
  createPublicAppointment,
  getPublicBookingManagement,
  requestPublicCancellation,
};
