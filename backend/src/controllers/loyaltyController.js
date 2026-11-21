const Customer = require('../models/Customer');
const LoyaltyTransaction = require('../models/LoyaltyTransaction');
const Appointment = require('../models/Appointment');
const { sendSuccess, sendError } = require('../utils/response');
const { redeemAppointmentPoints } = require('../services/loyaltyService');
const { EARN_POINTS_PER_100, MIN_REDEEM_POINTS, MAX_REDEMPTION_PERCENT, RUPEES_PER_POINT } = require('../utils/loyaltyRules');

const getOverview = async (req, res, next) => {
  try {
    const organizationId = req.organizationId;
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const [customerStats, monthly, customers, transactions] = await Promise.all([
      Customer.aggregate([
        { $match: { organizationId: req.organizationId, isActive: true } },
        { $group: {
          _id: null,
          activeCustomers: { $sum: 1 },
          customersWithPoints: { $sum: { $cond: [{ $gt: ['$loyaltyPoints', 0] }, 1, 0] } },
          outstandingPoints: { $sum: { $ifNull: ['$loyaltyPoints', 0] } },
          lifetimePoints: { $sum: { $ifNull: ['$lifetimeLoyaltyPoints', 0] } },
        } },
      ]),
      LoyaltyTransaction.aggregate([
        { $match: { organizationId, createdAt: { $gte: monthStart } } },
        { $group: {
          _id: '$type',
          points: { $sum: { $abs: '$points' } },
          count: { $sum: 1 },
        } },
      ]),
      Customer.find({ organizationId, isActive: true, loyaltyPoints: { $gt: 0 } })
        .select('name phone email loyaltyPoints lifetimeLoyaltyPoints lastVisit')
        .sort({ loyaltyPoints: -1, name: 1 }).limit(50),
      LoyaltyTransaction.find({ organizationId })
        .populate('customerId', 'name phone')
        .populate('appointmentId', 'appointmentDate appointmentTime')
        .sort({ createdAt: -1 }).limit(20),
    ]);

    const byType = Object.fromEntries(monthly.map((item) => [item._id, item]));
    const stats = customerStats[0] || { activeCustomers: 0, customersWithPoints: 0, outstandingPoints: 0, lifetimePoints: 0 };
    return sendSuccess(res, 'Loyalty overview retrieved', {
      stats: {
        ...stats,
        earnedThisMonth: byType.earned?.points || 0,
        redeemedThisMonth: byType.redeemed?.points || 0,
        refundsThisMonth: byType.refund?.points || 0,
      },
      customers,
      transactions,
      rules: { earnPointsPer100: EARN_POINTS_PER_100, minRedeemPoints: MIN_REDEEM_POINTS, maxRedemptionPercent: MAX_REDEMPTION_PERCENT, rupeesPerPoint: RUPEES_PER_POINT },
    });
  } catch (error) { return next(error); }
};

const getCustomerLoyalty = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const organizationId = req.organizationId;
    const customer = await Customer.findOne({ _id: customerId, organizationId, isActive: true })
      .select('name phone email loyaltyPoints lifetimeLoyaltyPoints totalBookings lastVisit');
    if (!customer) return sendError(res, 'Customer not found.', 404);

    const [appointments, transactions] = await Promise.all([
      Appointment.find({ organizationId, customerId, status: { $in: ['pending', 'confirmed'] }, $or: [{ loyaltyPointsRedeemed: 0 }, { loyaltyPointsRedeemed: { $exists: false } }] })
        .select('appointmentDate appointmentTime status price serviceId loyaltyPointsRedeemed')
        .populate('serviceId', 'name')
        .sort({ appointmentDate: 1, appointmentTime: 1 }).limit(30),
      LoyaltyTransaction.find({ organizationId, customerId })
        .populate('appointmentId', 'appointmentDate appointmentTime')
        .sort({ createdAt: -1 }).limit(30),
    ]);
    return sendSuccess(res, 'Customer loyalty details retrieved', { customer, appointments, transactions });
  } catch (error) { return next(error); }
};

const redeemPoints = async (req, res, next) => {
  try {
    const { customerId, appointmentId, points } = req.body || {};
    if (!customerId || !appointmentId || points === undefined) {
      return sendError(res, 'customerId, appointmentId and points are required.', 400);
    }
    const result = await redeemAppointmentPoints({
      organizationId: req.organizationId,
      customerId,
      appointmentId,
      points,
      createdBy: req.user._id,
    });
    if (result.error) return sendError(res, result.error, result.status || 400, result.maxRedeemable ? { maxRedeemable: result.maxRedeemable } : null);
    return sendSuccess(res, `${result.points} points applied. ₹${result.discountAmount.toFixed(2)} discount added.`, result);
  } catch (error) { return next(error); }
};

module.exports = { getOverview, getCustomerLoyalty, redeemPoints };
