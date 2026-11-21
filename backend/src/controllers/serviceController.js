const Service = require('../models/Service');
const { sendSuccess, sendError } = require('../utils/response');

const getServices = async (req, res, next) => {
  try {
    const services = await Service.find({ organizationId: req.organizationId, isActive: true }).sort({ name: 1 });
    sendSuccess(res, 'Services retrieved', services.map((service) => ({ ...service.toObject(), currency: 'INR' })));
  } catch (err) { next(err); }
};

const createService = async (req, res, next) => {
  try {
    const service = await Service.create({ ...req.body, currency: 'INR', organizationId: req.organizationId });
    sendSuccess(res, 'Service created', service, 201);
  } catch (err) { next(err); }
};

const updateService = async (req, res, next) => {
  try {
    const service = await Service.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { ...req.body, currency: 'INR' },
      { new: true, runValidators: true }
    );
    if (!service) return sendError(res, 'Service not found', 404);
    sendSuccess(res, 'Service updated', service);
  } catch (err) { next(err); }
};

const deleteService = async (req, res, next) => {
  try {
    const service = await Service.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { isActive: false },
      { new: true }
    );
    if (!service) return sendError(res, 'Service not found', 404);
    sendSuccess(res, 'Service deleted');
  } catch (err) { next(err); }
};

module.exports = { getServices, createService, updateService, deleteService };
