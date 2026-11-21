const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Customer = require('../models/Customer');
const Service = require('../models/Service');
const Staff = require('../models/Staff');
const Organization = require('../models/Organization');
const Offer = require('../models/Offer');
const { buildOfferRecommendationFallback, normalizeOfferRecommendations, buildRetentionSegments } = require('../utils/aiFeatureRules');
const { sendSuccess, sendError } = require('../utils/response');
const { generateSlots, isOnLeave } = require('../utils/slotGenerator');
const {
  parseDateOnly,
  getDayBounds,
  getDayName,
  timeToMinutes,
  calculateEndTime,
  hasAppointmentConflict,
  isSlotInPast,
} = require('../utils/appointmentTime');
const { generateJson, generateText, isAIConfigured, getModel } = require('../services/aiService');
const { formatINR, normalizeRupeeText } = require('../utils/currency');

const appointmentIntentSchema = {
  type: 'object',
  properties: {
    date: { type: 'string', description: 'Requested calendar date as YYYY-MM-DD.' },
    afterTime: { type: ['string', 'null'], description: 'Return slots starting at or after this 24-hour HH:MM time, or null.' },
    preferredTime: { type: ['string', 'null'], description: 'Preferred 24-hour HH:MM time for around/near requests, or null.' },
  },
  required: ['date', 'afterTime', 'preferredTime'],
  additionalProperties: false,
};

const customerSummarySchema = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    recommendedAction: { type: 'string' },
  },
  required: ['summary', 'recommendedAction'],
  additionalProperties: false,
};

const insightSchema = {
  type: 'object',
  properties: {
    insights: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['revenue_trend', 'booking_volume', 'service_performance', 'attendance'] },
          type: { type: 'string', enum: ['positive', 'negative', 'info', 'tip'] },
          icon: { type: 'string' },
          title: { type: 'string' },
          text: { type: 'string' },
          action: { type: 'string' },
        },
        required: ['category', 'type', 'icon', 'title', 'text', 'action'],
        additionalProperties: false,
      },
    },
  },
  required: ['insights'],
  additionalProperties: false,
};

const staffSummarySchema = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    recommendedAction: { type: 'string' },
  },
  required: ['summary', 'recommendedAction'],
  additionalProperties: false,
};

const offerRecommendationsSchema = {
  type: 'object',
  properties: {
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          audience: { type: 'string' },
          discountType: { type: 'string', enum: ['percentage', 'fixed'] },
          discountValue: { type: 'number' },
          maxDiscountAmount: { type: ['number', 'null'] },
          minimumBookingAmount: { type: 'number' },
          rationale: { type: 'string' },
          guardrail: { type: 'string' },
        },
        required: ['title', 'audience', 'discountType', 'discountValue', 'maxDiscountAmount', 'minimumBookingAmount', 'rationale', 'guardrail'],
        additionalProperties: false,
      },
    },
  },
  required: ['recommendations'],
  additionalProperties: false,
};

const retentionSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          segment: { type: 'string', enum: ['at_risk', 'loyal', 'returning', 'new'] },
          title: { type: 'string' },
          reason: { type: 'string' },
          action: { type: 'string' },
        },
        required: ['segment', 'title', 'reason', 'action'],
        additionalProperties: false,
      },
    },
  },
  required: ['summary', 'actions'],
  additionalProperties: false,
};

const formatDateForTimezone = (date, timezone) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const addDaysToDateKey = (dateKey, days) => {
  const parsed = parseDateOnly(dateKey);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-${String(parsed.getUTCDate()).padStart(2, '0')}`;
};

const fallbackPreferences = (query, today) => {
  const lower = String(query || '').toLowerCase();
  let date = today;
  const explicitDate = lower.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (explicitDate) date = explicitDate[1];
  else if (lower.includes('day after tomorrow')) date = addDaysToDateKey(today, 2);
  else if (lower.includes('tomorrow')) date = addDaysToDateKey(today, 1);
  else if (lower.includes('next week')) date = addDaysToDateKey(today, 7);

  let afterTime = null;
  let preferredTime = null;
  const timeMatch = lower.match(/\b(after|around|near|at)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (timeMatch) {
    let hours = Number(timeMatch[2]);
    const minutes = Number(timeMatch[3] || 0);
    const meridiem = timeMatch[4];
    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
    if (!meridiem && hours <= 7 && (lower.includes('evening') || lower.includes('afternoon'))) hours += 12;
    if (hours >= 0 && hours <= 23 && minutes < 60) {
      const value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      if (timeMatch[1] === 'after') afterTime = value;
      else preferredTime = value;
    }
  }
  if (!preferredTime && lower.includes('morning')) preferredTime = '09:00';
  if (!preferredTime && lower.includes('afternoon')) preferredTime = '14:00';
  if (!preferredTime && lower.includes('evening')) preferredTime = '17:00';
  return { date, afterTime, preferredTime };
};

const normalizePreferences = (value, fallback, today) => {
  const date = typeof value?.date === 'string' ? value.date : fallback.date;
  try {
    parseDateOnly(date);
  } catch {
    return fallback;
  }
  if (date < today) return fallback;
  const normalizeTime = (time) => {
    if (time === null || time === undefined || time === '') return null;
    try {
      timeToMinutes(time);
      return time;
    } catch {
      return null;
    }
  };
  return {
    date,
    afterTime: normalizeTime(value?.afterTime) || fallback.afterTime,
    preferredTime: normalizeTime(value?.preferredTime) || fallback.preferredTime,
  };
};

const parsePreferencesWithAI = async (query, today, timezone = 'Asia/Kolkata') => {
  const fallback = fallbackPreferences(query, today);
  if (!isAIConfigured()) return { preferences: fallback, aiPowered: false };

  try {
    const parsed = await generateJson({
      systemInstruction: [
        'You parse appointment scheduling requests for a business booking application.',
        'Return only fields matching the JSON schema. Use the provided reference date and timezone.',
        'Do not invent a staff member or service; those are selected separately.',
        'For after-time requests, set afterTime. For around/near/at requests, set preferredTime.',
        'Use null for unspecified times. Return date as YYYY-MM-DD.',
      ].join(' '),
      prompt: `Reference date: ${today}. Business timezone: ${timezone}. User request: ${query}`,
      responseSchema: appointmentIntentSchema,
      schemaName: 'appointment_intent',
      temperature: 0.1,
    });
    if (!parsed) return { preferences: fallback, aiPowered: false };
    return { preferences: normalizePreferences(parsed, fallback, today), aiPowered: true };
  } catch (error) {
    // A model/network failure should not crash booking suggestions; the UI can identify fallback mode.
    console.warn('[AI] Appointment intent extraction unavailable:', error.code || error.message);
    return { preferences: fallback, aiPowered: false };
  }
};

/** AI-assisted slot suggestions. The LLM parses intent; backend rules remain authoritative. */
const smartSuggest = async (req, res, next) => {
  try {
    const query = String(req.body.query || '').trim();
    const { staffId, serviceId } = req.body;
    const orgId = req.organizationId;

    if (!query || query.length > 500) return sendError(res, 'Please enter a request between 1 and 500 characters.', 400);
    if (!staffId || !serviceId) return sendError(res, 'Select both a staff member and a service.', 400);

    const [staff, service, organization] = await Promise.all([
      Staff.findOne({ _id: staffId, organizationId: orgId, isActive: true }),
      Service.findOne({ _id: serviceId, organizationId: orgId, isActive: true }),
      Organization.findById(orgId).select('settings.timezone'),
    ]);
    if (!staff || !service) return sendError(res, 'The selected staff member or service is unavailable.', 404);

    const timezone = organization?.settings?.timezone || 'Asia/Kolkata';
    const today = formatDateForTimezone(new Date(), timezone);
    const { preferences, aiPowered } = await parsePreferencesWithAI(query, today, timezone);
    const targetDate = parseDateOnly(preferences.date);
    const dayName = getDayName(targetDate);
    const bounds = getDayBounds(targetDate);

    if (!(staff.workingHours?.days || []).includes(dayName) || isOnLeave(targetDate, staff.leaves || [])) {
      return sendSuccess(res, 'No availability on this date', {
        message: `${staff.name} is not available on ${preferences.date}. Try another date.`,
        date: preferences.date,
        slots: [],
        staff: { name: staff.name },
        service: { name: service.name, duration: service.duration },
        aiPowered,
        aiModel: aiPowered ? getModel() : null,
      });
    }

    const allSlots = generateSlots(staff.workingHours.start, staff.workingHours.end, service.duration);
    let filteredSlots = allSlots;
    if (preferences.afterTime) {
      const threshold = timeToMinutes(preferences.afterTime);
      filteredSlots = filteredSlots.filter((slot) => timeToMinutes(slot) >= threshold);
    } else if (preferences.preferredTime) {
      const preferred = timeToMinutes(preferences.preferredTime);
      filteredSlots = [...filteredSlots].sort((a, b) => Math.abs(timeToMinutes(a) - preferred) - Math.abs(timeToMinutes(b) - preferred));
    }

    const booked = await Appointment.find({
      organizationId: orgId,
      staffId,
      appointmentDate: { $gte: bounds.start, $lte: bounds.end },
      status: { $nin: ['cancelled'] },
    }).populate('serviceId', 'duration').select('appointmentTime endTime serviceId status');

    const available = filteredSlots.filter((slot) => {
      try {
        if (isSlotInPast(targetDate, slot, timezone)) return false;
        const proposedEnd = calculateEndTime(slot, service.duration);
        return !hasAppointmentConflict(booked, slot, proposedEnd, service.duration);
      } catch {
        return false;
      }
    }).slice(0, 5);

    const dateLabel = new Date(`${preferences.date}T12:00:00.000Z`).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
    });
    const message = available.length
      ? `I found ${available.length} available slot(s) for ${dateLabel}${preferences.afterTime ? ` after ${preferences.afterTime}` : preferences.preferredTime ? ` near ${preferences.preferredTime}` : ''}. Choose one of the suggested times.`
      : `No available slots found for ${dateLabel}. Try another date or staff member.`;

    sendSuccess(res, 'Appointment suggestions', {
      message,
      date: preferences.date,
      slots: available,
      staff: { name: staff.name },
      service: { name: service.name, duration: service.duration },
      aiPowered,
      aiModel: aiPowered ? getModel() : null,
      notice: aiPowered ? null : 'Using built-in date/time parsing. Add GROQ_API_KEY to enable Groq-powered natural-language interpretation.',
    });
  } catch (err) { next(err); }
};

/**
 * Customer-level retention brief. Unlike dashboard insights, this feature focuses on
 * one customer's complete history and a single relevant follow-up action.
 */
const customerSummary = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const orgId = req.organizationId;
    if (!mongoose.isValidObjectId(customerId)) return sendError(res, 'Invalid customer ID', 400);
    const customerObjectId = new mongoose.Types.ObjectId(customerId);
    const [customer, visitTotals, serviceCounts, noShows, cancellations, latestCompleted] = await Promise.all([
      Customer.findOne({ _id: customerId, organizationId: orgId }),
      Appointment.aggregate([
        { $match: { customerId: customerObjectId, organizationId: orgId, status: 'completed' } },
        { $group: { _id: null, totalVisits: { $sum: 1 }, totalSpent: { $sum: '$price' } } },
      ]),
      Appointment.aggregate([
        { $match: { customerId: customerObjectId, organizationId: orgId, status: 'completed' } },
        { $group: { _id: '$serviceId', count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 1 },
        { $lookup: { from: 'services', localField: '_id', foreignField: '_id', as: 'service' } },
        { $unwind: { path: '$service', preserveNullAndEmptyArrays: true } },
      ]),
      Appointment.countDocuments({ customerId, organizationId: orgId, status: 'no_show' }),
      Appointment.countDocuments({ customerId, organizationId: orgId, status: 'cancelled' }),
      Appointment.findOne({ customerId, organizationId: orgId, status: 'completed' }).sort({ appointmentDate: -1 }).select('appointmentDate'),
    ]);
    if (!customer) return sendError(res, 'Customer not found', 404);

    const totals = visitTotals[0] || { totalVisits: 0, totalSpent: 0 };
    const totalVisits = totals.totalVisits || 0;
    const totalSpent = totals.totalSpent || 0;
    const favouriteService = serviceCounts[0]?.service?.name || 'N/A';
    const lastVisit = customer.lastVisit || latestCompleted?.appointmentDate || null;
    const daysSinceLastVisit = lastVisit
      ? Math.max(0, Math.floor((Date.now() - new Date(lastVisit).getTime()) / 86400000))
      : null;
    let relationshipStage = 'new';
    if (totalVisits > 0 && daysSinceLastVisit !== null && daysSinceLastVisit >= 45) relationshipStage = 'at_risk';
    else if (totalVisits >= 5) relationshipStage = 'loyal';
    else if (totalVisits > 0) relationshipStage = 'returning';

    const facts = {
      customerName: customer.name,
      totalVisits,
      totalSpent,
      currency: 'INR',
      favouriteService,
      lastVisit,
      daysSinceLastVisit,
      noShows,
      cancellations,
      relationshipStage,
    };

    const fallbackSummary = totalVisits === 0
      ? `${customer.name} has no completed visits recorded yet. This is a new customer relationship, so the first completed visit will establish a useful baseline.`
      : `${customer.name} has ${totalVisits} completed visit(s) and recorded spend of ${formatINR(totalSpent)}. Most frequently used service: ${favouriteService}. ${daysSinceLastVisit === null ? 'A last visit date is not available.' : `Last completed visit was ${daysSinceLastVisit} day(s) ago.`}`;
    const fallbackActions = {
      new: 'After the first visit is completed, record the outcome and invite the customer to rebook if appropriate.',
      returning: 'Use the customer’s preferred service history to make the next booking easier; avoid sending unnecessary promotions.',
      loyal: 'Consider a loyalty reward for a future eligible visit, if the business has an active offer.',
      at_risk: 'Consider a polite, consent-based re-engagement message and make it easy to book again.',
    };
    let summaryText = fallbackSummary;
    let recommendedAction = fallbackActions[relationshipStage];
    let aiPowered = false;

    if (isAIConfigured()) {
      try {
        const generated = await generateJson({
          systemInstruction: [
            'You are a customer-retention analyst inside an appointment-management SaaS.',
            'This is an individual customer brief, not a business dashboard report and not an appointment-slot response.',
            'Write a factual 2-3 sentence visit-history summary and one respectful, specific follow-up action.',
            'Use only supplied facts. Do not invent customer preferences, dates, spending, reasons for inactivity, or outcomes.',
            'Do not include contact details or claim an offer exists unless the input says it does.',
            'All monetary values are Indian Rupees (INR). Use the ₹ symbol for any amount; never use $ or USD.',
            'If the customer is new, recommend an appropriate first-visit follow-up; if at risk, suggest consent-based re-engagement; if loyal, suggest a relevant retention action.',
          ].join(' '),
          prompt: JSON.stringify(facts),
          responseSchema: customerSummarySchema,
          schemaName: 'customer_retention_brief',
          temperature: 0.2,
        });
        if (generated && typeof generated.summary === 'string' && generated.summary.trim()
          && typeof generated.recommendedAction === 'string' && generated.recommendedAction.trim()) {
          summaryText = normalizeRupeeText(generated.summary.trim()).slice(0, 900);
          recommendedAction = normalizeRupeeText(generated.recommendedAction.trim()).slice(0, 400);
          aiPowered = true;
        }
      } catch (error) {
        console.warn('[AI] Customer retention brief fell back to calculated text:', error.code || error.message);
      }
    }

    sendSuccess(res, 'Customer retention brief', {
      ...facts,
      aiInsight: summaryText,
      recommendedAction,
      aiPowered,
      aiModel: aiPowered ? getModel() : null,
      notice: isAIConfigured() && !aiPowered ? 'AI provider unavailable; showing a calculated customer brief.' : null,
    });
  } catch (err) { next(err); }
};

const percentage = (numerator, denominator) => denominator > 0
  ? Number(((numerator / denominator) * 100).toFixed(1))
  : null;

const countByStatus = (rows) => Object.fromEntries(rows.map((row) => [row._id, row.count]));

const makeDashboardFallbacks = (facts) => {
  const insights = [];
  if (facts.revenueChangePercent !== null) {
    const increased = facts.revenueChangePercent >= 0;
    insights.push({
      category: 'revenue_trend',
      type: increased ? 'positive' : 'negative',
      icon: increased ? '📈' : '📉',
      title: 'Completed revenue trend',
      text: `Completed-appointment revenue ${increased ? 'increased' : 'decreased'} by ${Math.abs(facts.revenueChangePercent)}% compared with the previous month.`,
      action: 'Review completed appointments and compare revenue by service before changing prices.',
    });
  }
  if (facts.mostBookedService) {
    insights.push({
      category: 'service_performance', type: 'info', icon: '⭐',
      title: 'Most-booked service this month',
      text: `${facts.mostBookedService} has ${facts.mostBookedServiceBookings} non-cancelled booking(s) this month.`,
      action: 'Check staff capacity for this service and ensure its next available slots are accurate.',
    });
  }
  if (facts.monthToDateBookings > 0) {
    const cancellationRate = facts.cancellationRatePercent;
    const noShowRate = facts.noShowRatePercent;
    insights.push({
      category: 'attendance', type: (cancellationRate || 0) >= 20 || (noShowRate || 0) >= 10 ? 'negative' : 'tip', icon: '🗓️',
      title: 'Booking attendance',
      text: `This month: ${facts.monthToDateCancellations} cancellation(s) (${cancellationRate === null ? 'n/a' : `${cancellationRate}%`}) and ${facts.monthToDateNoShows} no-show(s) (${noShowRate === null ? 'n/a' : `${noShowRate}%`}).`,
      action: 'Review reminder timing and cancellation patterns before introducing a new policy.',
    });
  }
  if (!insights.length) {
    insights.push({
      category: 'booking_volume', type: 'info', icon: '📅',
      title: 'Build your first business baseline',
      text: 'There is not enough completed-booking history yet to calculate a month-over-month revenue trend.',
      action: 'Add services and staff, then record a few real or clearly marked demo appointments to populate analytics.',
    });
  }
  return insights.slice(0, 3);
};

/** Business-level performance insights. Unlike customer summaries, this explains aggregate KPIs and actions. */
const dashboardInsights = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    const lastMonth = new Date(thisMonth);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthEnd = new Date(thisMonth.getTime() - 1);

    const [thisRev, lastRev, thisStatusRows, lastStatusRows, topService] = await Promise.all([
      Appointment.aggregate([
        { $match: { organizationId: orgId, status: 'completed', appointmentDate: { $gte: thisMonth } } },
        { $group: { _id: null, total: { $sum: '$price' } } },
      ]),
      Appointment.aggregate([
        { $match: { organizationId: orgId, status: 'completed', appointmentDate: { $gte: lastMonth, $lte: lastMonthEnd } } },
        { $group: { _id: null, total: { $sum: '$price' } } },
      ]),
      Appointment.aggregate([
        { $match: { organizationId: orgId, appointmentDate: { $gte: thisMonth } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Appointment.aggregate([
        { $match: { organizationId: orgId, appointmentDate: { $gte: lastMonth, $lte: lastMonthEnd } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Appointment.aggregate([
        { $match: { organizationId: orgId, appointmentDate: { $gte: thisMonth }, status: { $nin: ['cancelled'] } } },
        { $group: { _id: '$serviceId', count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 1 },
        { $lookup: { from: 'services', localField: '_id', foreignField: '_id', as: 'service' } },
        { $unwind: '$service' },
      ]),
    ]);

    const thisRevenue = thisRev[0]?.total || 0;
    const lastRevenue = lastRev[0]?.total || 0;
    const revenueChangePercent = lastRevenue > 0 ? Number((((thisRevenue - lastRevenue) / lastRevenue) * 100).toFixed(1)) : null;
    const thisStatuses = countByStatus(thisStatusRows);
    const lastStatuses = countByStatus(lastStatusRows);
    const monthToDateBookings = Object.values(thisStatuses).reduce((sum, count) => sum + count, 0);
    const previousMonthBookings = Object.values(lastStatuses).reduce((sum, count) => sum + count, 0);
    const nonCancelledThisMonth = monthToDateBookings - (thisStatuses.cancelled || 0);
    const facts = {
      monthToDateCompletedRevenue: thisRevenue,
      previousMonthCompletedRevenue: lastRevenue,
      revenueChangePercent,
      monthToDateBookings,
      previousMonthBookings,
      bookingChangePercent: previousMonthBookings > 0 ? Number((((monthToDateBookings - previousMonthBookings) / previousMonthBookings) * 100).toFixed(1)) : null,
      monthToDateCancellations: thisStatuses.cancelled || 0,
      cancellationRatePercent: percentage(thisStatuses.cancelled || 0, monthToDateBookings),
      monthToDateNoShows: thisStatuses.no_show || 0,
      noShowRatePercent: percentage(thisStatuses.no_show || 0, nonCancelledThisMonth),
      mostBookedService: topService[0]?.service?.name || null,
      mostBookedServiceBookings: topService[0]?.count || 0,
    };

    let insights = makeDashboardFallbacks(facts);
    let aiPowered = false;
    if (isAIConfigured()) {
      try {
        const generated = await generateJson({
          systemInstruction: [
            'You are a business-performance analyst for an appointment-management SaaS.',
            'This is an aggregate business KPI report, not an individual customer summary and not a booking-slot assistant.',
            'Return 2-3 concise insights with distinct categories chosen only from revenue_trend, booking_volume, service_performance, attendance.',
            'Use only the supplied metrics. Do not invent percentages, counts, causes, customer preferences, or historical comparisons.',
            'Every insight needs a short title, evidence-based observation and a practical next action. Do not repeat the same advice in multiple insights.',
            'If a metric has no comparison value, do not claim that it increased or decreased.',
            'All monetary values are Indian Rupees (INR). Use the ₹ symbol for any amount; never use $ or USD.',
          ].join(' '),
          prompt: JSON.stringify(facts),
          responseSchema: insightSchema,
          schemaName: 'business_performance_insights',
          temperature: 0.2,
        });
        const allowedCategories = new Set(['revenue_trend', 'booking_volume', 'service_performance', 'attendance']);
        const seenCategories = new Set();
        const safeInsights = (Array.isArray(generated?.insights) ? generated.insights : [])
          .filter((item) => {
            if (!item || !allowedCategories.has(item.category) || seenCategories.has(item.category)) return false;
            if (item.category === 'revenue_trend' && facts.revenueChangePercent === null) return false;
            if (item.category === 'booking_volume' && facts.bookingChangePercent === null) return false;
            if (item.category === 'service_performance' && !facts.mostBookedService) return false;
            if (item.category === 'attendance' && facts.monthToDateBookings === 0) return false;
            if (typeof item.title !== 'string' || !item.title.trim() || typeof item.text !== 'string' || !item.text.trim() || typeof item.action !== 'string' || !item.action.trim()) return false;
            seenCategories.add(item.category);
            return true;
          })
          .slice(0, 3)
          .map((item) => ({
            category: item.category,
            type: ['positive', 'negative', 'info', 'tip'].includes(item.type) ? item.type : 'info',
            icon: typeof item.icon === 'string' ? item.icon.slice(0, 4) : '✨',
            title: normalizeRupeeText(item.title.trim()).slice(0, 100),
            text: normalizeRupeeText(item.text.trim()).slice(0, 400),
            action: normalizeRupeeText(item.action.trim()).slice(0, 300),
          }));
        if (safeInsights.length) { insights = safeInsights; aiPowered = true; }
      } catch (error) {
        console.warn('[AI] Dashboard insights fell back to calculated insights:', error.code || error.message);
      }
    }

    sendSuccess(res, 'Dashboard insights', {
      insights,
      metrics: facts,
      aiPowered,
      aiModel: aiPowered ? getModel() : null,
      notice: isAIConfigured() && !aiPowered ? 'AI provider unavailable; showing evidence-based calculated insights.' : null,
    });
  } catch (err) { next(err); }
};


/** Staff-level operational brief. Metrics are calculated from the tenant's own appointment records. */
const staffSummary = async (req, res, next) => {
  try {
    const { staffId } = req.params;
    if (!mongoose.isValidObjectId(staffId)) return sendError(res, 'Invalid staff ID.', 400);
    const orgId = new mongoose.Types.ObjectId(String(req.organizationId));
    const staffObjectId = new mongoose.Types.ObjectId(String(staffId));
    const staff = await Staff.findOne({ _id: staffObjectId, organizationId: orgId }).lean();
    if (!staff) return sendError(res, 'Staff member not found.', 404);

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const [statusRows, monthRows, topServiceRows, upcomingAppointments] = await Promise.all([
      Appointment.aggregate([
        { $match: { organizationId: orgId, staffId: staffObjectId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Appointment.aggregate([
        { $match: { organizationId: orgId, staffId: staffObjectId, appointmentDate: { $gte: monthStart, $lt: nextMonthStart } } },
        { $lookup: { from: 'services', localField: 'serviceId', foreignField: '_id', as: 'service' } },
        { $unwind: { path: '$service', preserveNullAndEmptyArrays: true } },
        { $group: {
          _id: null,
          bookings: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          noShows: { $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] } },
          completedRevenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, { $ifNull: ['$price', 0] }, 0] } },
          scheduledMinutes: { $sum: { $cond: [{ $in: ['$status', ['pending', 'confirmed']] }, { $ifNull: ['$service.duration', 0] }, 0] } },
        } },
      ]),
      Appointment.aggregate([
        { $match: { organizationId: orgId, staffId: staffObjectId, appointmentDate: { $gte: monthStart, $lt: nextMonthStart }, status: 'completed' } },
        { $group: { _id: '$serviceId', count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 1 },
        { $lookup: { from: 'services', localField: '_id', foreignField: '_id', as: 'service' } },
        { $unwind: { path: '$service', preserveNullAndEmptyArrays: true } },
      ]),
      Appointment.countDocuments({ organizationId: orgId, staffId: staffObjectId, appointmentDate: { $gte: now }, status: { $in: ['pending', 'confirmed'] } }),
    ]);

    const statusCounts = countByStatus(statusRows);
    const month = monthRows[0] || { bookings: 0, completed: 0, cancelled: 0, noShows: 0, completedRevenue: 0, scheduledMinutes: 0 };
    const startMinutes = timeToMinutes(staff.workingHours?.start || '09:00');
    const endMinutes = timeToMinutes(staff.workingHours?.end || '18:00');
    const daysPerWeek = (staff.workingHours?.days || []).length;
    const facts = {
      staffName: staff.name,
      specialization: staff.specialization || 'General',
      allTimeAppointments: Object.values(statusCounts).reduce((total, value) => total + value, 0),
      completedAppointments: statusCounts.completed || 0,
      upcomingAppointments,
      cancelledAppointments: statusCounts.cancelled || 0,
      noShows: statusCounts.no_show || 0,
      bookingsThisMonth: month.bookings || 0,
      completedThisMonth: month.completed || 0,
      cancellationsThisMonth: month.cancelled || 0,
      noShowsThisMonth: month.noShows || 0,
      completedRevenueThisMonth: Math.max(0, Number(month.completedRevenue) || 0),
      currency: 'INR',
      bookedHoursThisMonth: Number(((month.scheduledMinutes || 0) / 60).toFixed(1)),
      scheduledHoursPerWeek: Number((Math.max(0, endMinutes - startMinutes) * daysPerWeek / 60).toFixed(1)),
      topCompletedServiceThisMonth: topServiceRows[0]?.service?.name || null,
      workingDaysPerWeek: daysPerWeek,
    };
    let summary = `${staff.name} has ${facts.completedAppointments} completed appointment(s) and ${upcomingAppointments} upcoming appointment(s). This month, ${facts.bookingsThisMonth} booking(s) have been recorded, with ${facts.bookedHoursThisMonth} hours of pending/confirmed service time.`;
    let recommendedAction = 'Review upcoming bookings against the staff member’s working hours and leave calendar before adding more appointments.';
    let aiPowered = false;
    if (isAIConfigured()) {
      try {
        const generated = await generateJson({
          systemInstruction: [
            'You are an operational scheduling analyst for an appointment-management SaaS.',
            'This is a staff workload brief, not an individual customer summary and not a ranking of employees.',
            'Use only supplied metrics. Do not invent quality scores, customer sentiment, causes, or facts.',
            'Write a concise 2-3 sentence summary and one practical scheduling action.',
            'Do not call any staff member best or worst. Mention Indian Rupees with ₹ when discussing revenue.',
          ].join(' '),
          prompt: JSON.stringify(facts), responseSchema: staffSummarySchema, schemaName: 'staff_workload_brief', temperature: 0.2,
        });
        if (generated?.summary?.trim() && generated?.recommendedAction?.trim()) {
          summary = normalizeRupeeText(generated.summary.trim()).slice(0, 800);
          recommendedAction = normalizeRupeeText(generated.recommendedAction.trim()).slice(0, 350);
          aiPowered = true;
        }
      } catch (error) { console.warn('[AI] Staff summary fell back to calculated text:', error.code || error.message); }
    }
    return sendSuccess(res, 'Staff workload summary', {
      metrics: facts, summary, recommendedAction, aiPowered, aiModel: aiPowered ? getModel() : null,
      notice: isAIConfigured() && !aiPowered ? 'Groq was unavailable; showing database-calculated staff metrics.' : null,
    });
  } catch (error) { return next(error); }
};

/** Offer ideas are advisory only. The owner must review and save a draft before customers can use them. */
const offerRecommendations = async (req, res, next) => {
  try {
    const orgId = new mongoose.Types.ObjectId(String(req.organizationId));
    const since = new Date(Date.now() - 30 * 86400000);
    const [services, recentRows, topServiceRows, totalCustomers, activeOfferCount] = await Promise.all([
      Service.find({ organizationId: orgId, isActive: true }).select('name price').lean(),
      Appointment.aggregate([
        { $match: { organizationId: orgId, appointmentDate: { $gte: since } } },
        { $group: {
          _id: null,
          bookings: { $sum: 1 },
          completedRevenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, { $ifNull: ['$price', 0] }, 0] } },
          cancellations: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        } },
      ]),
      Appointment.aggregate([
        { $match: { organizationId: orgId, appointmentDate: { $gte: since }, status: { $nin: ['cancelled'] } } },
        { $group: { _id: '$serviceId', count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 3 },
        { $lookup: { from: 'services', localField: '_id', foreignField: '_id', as: 'service' } },
        { $unwind: { path: '$service', preserveNullAndEmptyArrays: true } },
      ]),
      Customer.countDocuments({ organizationId: orgId, isActive: true }),
      Offer.countDocuments({ organizationId: orgId, isActive: true }),
    ]);
    const period = recentRows[0] || { bookings: 0, completedRevenue: 0, cancellations: 0 };
    const prices = services.map((service) => Number(service.price) || 0).filter((price) => price > 0).sort((a, b) => a - b);
    const averageServicePrice = prices.length ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : 500;
    const facts = {
      totalCustomers,
      activeServiceCount: services.length,
      averageServicePrice,
      activeOfferCount,
      bookingsLast30Days: period.bookings || 0,
      completedRevenueLast30Days: Math.max(0, Number(period.completedRevenue) || 0),
      cancellationsLast30Days: period.cancellations || 0,
      topServicesLast30Days: topServiceRows.filter((row) => row.service?.name).map((row) => ({ name: row.service.name, bookings: row.count })),
      currency: 'INR',
    };
    let recommendations = buildOfferRecommendationFallback(facts);
    let aiPowered = false;
    if (isAIConfigured()) {
      try {
        const generated = await generateJson({
          systemInstruction: [
            'You are a conservative promotion strategist for a small appointment-based business.',
            'Return three distinct offer ideas, not a customer summary, staff report, or appointment-slot response.',
            'Use only the supplied business facts; do not invent sales causes or customer behavior.',
            'Keep percentage discounts between 5 and 20. Keep fixed discounts modest (₹25 to ₹200).',
            'Use a maximum discount cap for percentage offers, realistic minimumBookingAmount, explicit audiences, and safeguards.',
            'Recommendations are drafts only. Never claim an offer was created or sent.',
            'All monetary amounts are INR. Return every required field according to the schema.',
          ].join(' '),
          prompt: JSON.stringify(facts), responseSchema: offerRecommendationsSchema,
          schemaName: 'offer_recommendations', temperature: 0.3,
        });
        const safe = normalizeOfferRecommendations(generated?.recommendations, averageServicePrice);
        if (safe.length) { recommendations = safe; aiPowered = true; }
      } catch (error) { console.warn('[AI] Offer recommendations fell back to rule-based ideas:', error.code || error.message); }
    }
    return sendSuccess(res, 'Offer recommendations', {
      facts, recommendations, aiPowered, aiModel: aiPowered ? getModel() : null,
      notice: isAIConfigured() && !aiPowered ? 'Groq was unavailable; showing rule-based offer ideas.' : 'Suggestions are drafts only. Review eligibility and limits before saving an offer.',
    });
  } catch (error) { return next(error); }
};

/** Customer-retention brief. Names are returned only to the authenticated business workspace; the LLM receives aggregate counts only. */
const customerRetention = async (req, res, next) => {
  try {
    const orgId = new mongoose.Types.ObjectId(String(req.organizationId));
    const [customers, completedRows] = await Promise.all([
      Customer.find({ organizationId: orgId, isActive: true }).select('name lastVisit totalBookings').sort({ updatedAt: -1 }).limit(500).lean(),
      Appointment.aggregate([
        { $match: { organizationId: orgId, status: 'completed' } },
        { $group: { _id: '$customerId', completedVisits: { $sum: 1 }, totalSpent: { $sum: { $ifNull: ['$price', 0] } }, lastVisit: { $max: '$appointmentDate' } } },
      ]),
    ]);
    const retention = buildRetentionSegments(customers, completedRows, new Date());
    const facts = {
      totalCustomers: retention.totalCustomers,
      atRiskCustomers: retention.segments.at_risk || 0,
      loyalCustomers: retention.segments.loyal || 0,
      returningCustomers: retention.segments.returning || 0,
      newOrNoCompletedVisitCustomers: retention.segments.new || 0,
      atRiskDefinition: 'At least one completed visit and 30 or more days since the last completed visit.',
    };
    let summary = `${facts.atRiskCustomers} customer(s) meet the at-risk rule of 30+ days since their last completed visit. ${facts.loyalCustomers} customer(s) are classified as loyal based on five or more completed visits.`;
    let actions = [
      { segment: 'at_risk', title: 'Review at-risk customers', reason: 'These customers have a completed visit but no completed visit in at least 30 days.', action: 'Review the list and, only where marketing consent exists, send a respectful rebooking invitation.' },
      { segment: 'loyal', title: 'Recognize repeat visits', reason: 'These customers have at least five completed visits.', action: 'Consider a loyalty reward with clear eligibility and redemption limits.' },
      { segment: 'new', title: 'Guide new customers', reason: 'These customer records have no completed visits recorded.', action: 'After their first appointment is completed, invite them to rebook if appropriate.' },
    ];
    let aiPowered = false;
    if (isAIConfigured()) {
      try {
        const generated = await generateJson({
          systemInstruction: [
            'You are a customer retention planner for an appointment-based business.',
            'This is a business-level retention segment report, not an individual customer summary.',
            'Use only the aggregate counts supplied. Do not invent customer names, contact details, dates, reasons for inactivity, or campaign results.',
            'Provide concise summary and up to three segment-specific actions. Never claim a message was sent.',
            'Outreach must be consent-based; the application does not send marketing messages from this recommendation endpoint.',
          ].join(' '),
          prompt: JSON.stringify(facts), responseSchema: retentionSchema, schemaName: 'customer_retention_plan', temperature: 0.2,
        });
        if (generated?.summary?.trim() && Array.isArray(generated.actions) && generated.actions.length) {
          const allowedSegments = new Set(['at_risk', 'loyal', 'returning', 'new']);
          const safeActions = generated.actions.filter((action) => allowedSegments.has(action.segment)
            && action.title?.trim() && action.reason?.trim() && action.action?.trim()).slice(0, 3);
          if (safeActions.length) {
            summary = String(generated.summary).trim().slice(0, 800);
            actions = safeActions.map((action) => ({
              segment: action.segment,
              title: String(action.title).trim().slice(0, 100),
              reason: String(action.reason).trim().slice(0, 250),
              action: String(action.action).trim().slice(0, 300),
            }));
            aiPowered = true;
          }
        }
      } catch (error) { console.warn('[AI] Retention assistant fell back to calculated segments:', error.code || error.message); }
    }
    return sendSuccess(res, 'Customer retention brief', {
      ...facts, summary, actions, atRiskCustomers: retention.atRiskCustomers.map((customer) => ({
        id: customer.id, name: customer.name, completedVisits: customer.completedVisits,
        daysSinceLastVisit: customer.daysSinceLastVisit, lastVisit: customer.lastVisit,
        totalSpent: customer.totalSpent,
      })),
      aiPowered, aiModel: aiPowered ? getModel() : null,
      notice: 'This report does not send messages. Review marketing consent before contacting customers.',
    });
  } catch (error) { return next(error); }
};

module.exports = { smartSuggest, customerSummary, dashboardInsights, staffSummary, offerRecommendations, customerRetention, parsePreferencesWithAI, formatDateForTimezone };
