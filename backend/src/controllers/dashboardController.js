const Appointment = require('../models/Appointment');
const Customer = require('../models/Customer');
const Staff = require('../models/Staff');
const Service = require('../models/Service');
const { sendSuccess } = require('../utils/response');

const getDashboard = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    const [
      totalAppointments,
      todayAppointments,
      activeCustomers,
      activeStaff,
      revenueResult,
      statusBreakdown,
    ] = await Promise.all([
      Appointment.countDocuments({ organizationId: orgId }),
      Appointment.countDocuments({
        organizationId: orgId,
        appointmentDate: { $gte: today, $lte: todayEnd },
      }),
      Customer.countDocuments({ organizationId: orgId, isActive: true }),
      Staff.countDocuments({ organizationId: orgId, isActive: true }),
      Appointment.aggregate([
        { $match: { organizationId: orgId, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$price' } } },
      ]),
      Appointment.aggregate([
        { $match: { organizationId: orgId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const monthlyTrend = await Appointment.aggregate([
      {
        $match: {
          organizationId: orgId,
          appointmentDate: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: { year: { $year: '$appointmentDate' }, month: { $month: '$appointmentDate' } },
          count: { $sum: 1 },
          revenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$price', 0] } },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Top services
    const topServices = await Appointment.aggregate([
      { $match: { organizationId: orgId } },
      { $group: { _id: '$serviceId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'services', localField: '_id', foreignField: '_id', as: 'service' } },
      { $unwind: '$service' },
      { $project: { name: '$service.name', count: 1 } },
    ]);

    // Today's appointments detail
    const todayList = await Appointment.find({
      organizationId: orgId,
      appointmentDate: { $gte: today, $lte: todayEnd },
    })
      .populate('customerId', 'name phone')
      .populate('serviceId', 'name duration')
      .populate('staffId', 'name')
      .sort({ appointmentTime: 1 })
      .limit(10);

    sendSuccess(res, 'Dashboard data', {
      stats: {
        totalAppointments,
        todayAppointments,
        activeCustomers,
        activeStaff,
        totalRevenue: revenueResult[0]?.total || 0,
      },
      statusBreakdown,
      monthlyTrend,
      topServices,
      todayList,
    });
  } catch (err) { next(err); }
};

const getAnalytics = async (req, res, next) => {
  try {
    const orgId = req.organizationId;
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const from = new Date();
    from.setDate(from.getDate() - days);

    const [dailyRevenue, dailyAppointments] = await Promise.all([
      Appointment.aggregate([
        { $match: { organizationId: orgId, appointmentDate: { $gte: from }, status: 'completed' } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$appointmentDate' } }, revenue: { $sum: '$price' } } },
        { $sort: { _id: 1 } },
      ]),
      Appointment.aggregate([
        { $match: { organizationId: orgId, appointmentDate: { $gte: from } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$appointmentDate' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    sendSuccess(res, 'Analytics data', { dailyRevenue, dailyAppointments, period: days });
  } catch (err) { next(err); }
};

module.exports = { getDashboard, getAnalytics };
