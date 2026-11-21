const Customer = require('../models/Customer');
const Appointment = require('../models/Appointment');
const { sendSuccess, sendError } = require('../utils/response');
const { parsePagination, escapeRegex } = require('../utils/platformAdminRules');

const getCustomers = async (req, res, next) => {
  try {
    const pagination = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
    const { page, limit, skip } = pagination;
    const search = String(req.query.search || '').trim().slice(0, 100);
    const orgId = req.organizationId;
    const query = { organizationId: orgId, isActive: true };

    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
        { phone: { $regex: safeSearch, $options: 'i' } },
      ];
    }
    const [customers, total] = await Promise.all([
      Customer.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Customer.countDocuments(query),
    ]);

    sendSuccess(res, 'Customers retrieved', customers, 200, {
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) { next(err); }
};

const getCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, organizationId: req.organizationId });
    if (!customer) return sendError(res, 'Customer not found', 404);

    const appointments = await Appointment.find({ customerId: customer._id, organizationId: req.organizationId })
      .populate('serviceId', 'name price duration')
      .populate('staffId', 'name')
      .sort({ appointmentDate: -1 })
      .limit(10);

    sendSuccess(res, 'Customer retrieved', { customer, appointments });
  } catch (err) { next(err); }
};

const createCustomer = async (req, res, next) => {
  try {
    const { name, email, phone, notes } = req.body || {};
    const customer = await Customer.create({ name, email, phone, notes, organizationId: req.organizationId });
    sendSuccess(res, 'Customer created', customer, 201);
  } catch (err) { next(err); }
};

const updateCustomer = async (req, res, next) => {
  try {
    const { name, email, phone, notes } = req.body || {};
    const updates = {};
    for (const [key, value] of Object.entries({ name, email, phone, notes })) {
      if (value !== undefined) updates[key] = value;
    }
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!customer) return sendError(res, 'Customer not found', 404);
    sendSuccess(res, 'Customer updated', customer);
  } catch (err) { next(err); }
};

const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { isActive: false },
      { new: true }
    );
    if (!customer) return sendError(res, 'Customer not found', 404);
    sendSuccess(res, 'Customer deleted');
  } catch (err) { next(err); }
};

module.exports = { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer };
