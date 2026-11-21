const Staff = require('../models/Staff');
const Appointment = require('../models/Appointment');
const { sendSuccess, sendError } = require('../utils/response');

const getStaff = async (req, res, next) => {
  try {
    const staff = await Staff.find({ organizationId: req.organizationId, isActive: true }).sort({ name: 1 });
    sendSuccess(res, 'Staff retrieved', staff);
  } catch (err) { next(err); }
};

const getStaffMember = async (req, res, next) => {
  try {
    const staff = await Staff.findOne({ _id: req.params.id, organizationId: req.organizationId });
    if (!staff) return sendError(res, 'Staff not found', 404);

    const today = new Date();
    const schedule = await Appointment.find({
      staffId: staff._id,
      appointmentDate: { $gte: today },
      status: { $nin: ['cancelled'] },
    })
      .populate('customerId', 'name')
      .populate('serviceId', 'name duration')
      .sort({ appointmentDate: 1, appointmentTime: 1 })
      .limit(10);

    sendSuccess(res, 'Staff retrieved', { staff, schedule });
  } catch (err) { next(err); }
};

const createStaff = async (req, res, next) => {
  try {
    const staff = await Staff.create({ ...req.body, organizationId: req.organizationId });
    sendSuccess(res, 'Staff created', staff, 201);
  } catch (err) { next(err); }
};

const updateStaff = async (req, res, next) => {
  try {
    const staff = await Staff.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!staff) return sendError(res, 'Staff not found', 404);
    sendSuccess(res, 'Staff updated', staff);
  } catch (err) { next(err); }
};

const addLeave = async (req, res, next) => {
  try {
    const { dates } = req.body; // array of dates
    const staff = await Staff.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { $addToSet: { leaves: { $each: dates.map((d) => new Date(d)) } } },
      { new: true }
    );
    if (!staff) return sendError(res, 'Staff not found', 404);
    sendSuccess(res, 'Leave added', staff);
  } catch (err) { next(err); }
};

const removeLeave = async (req, res, next) => {
  try {
    const { date } = req.body;
    const staff = await Staff.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { $pull: { leaves: new Date(date) } },
      { new: true }
    );
    if (!staff) return sendError(res, 'Staff not found', 404);
    sendSuccess(res, 'Leave removed', staff);
  } catch (err) { next(err); }
};

const deleteStaff = async (req, res, next) => {
  try {
    const staff = await Staff.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { isActive: false },
      { new: true }
    );
    if (!staff) return sendError(res, 'Staff not found', 404);
    sendSuccess(res, 'Staff deleted');
  } catch (err) { next(err); }
};

module.exports = { getStaff, getStaffMember, createStaff, updateStaff, addLeave, removeLeave, deleteStaff };
