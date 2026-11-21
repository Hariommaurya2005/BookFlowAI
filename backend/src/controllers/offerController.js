const mongoose = require('mongoose');
const Offer = require('../models/Offer');
const Service = require('../models/Service');
const Organization = require('../models/Organization');
const { sendSuccess, sendError } = require('../utils/response');
const { validateOfferPayload } = require('../utils/offerRules');

const getOrganizationTimeZone = async (organizationId) => {
  const organization = await Organization.findById(organizationId).select('settings.timezone').lean();
  return organization?.settings?.timezone || 'Asia/Kolkata';
};

const validateServiceOwnership = async (serviceIds, organizationId) => {
  if (!serviceIds.length) return true;
  if (serviceIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) return false;
  const count = await Service.countDocuments({ _id: { $in: serviceIds }, organizationId, isActive: true });
  return count === new Set(serviceIds.map(String)).size;
};

const getOffers = async (req, res, next) => {
  try {
    const offers = await Offer.find({ organizationId: req.organizationId }).sort({ createdAt: -1 }).populate('serviceIds', 'name').lean();
    return sendSuccess(res, 'Offers retrieved', offers);
  } catch (error) { return next(error); }
};

const createOffer = async (req, res, next) => {
  try {
    const parsed = validateOfferPayload(req.body, await getOrganizationTimeZone(req.organizationId));
    if (!parsed.valid) return sendError(res, parsed.message, 400);
    if (!(await validateServiceOwnership(parsed.value.serviceIds, req.organizationId))) {
      return sendError(res, 'One or more selected services are invalid or inactive.', 400);
    }
    const offer = await Offer.create({ ...parsed.value, organizationId: req.organizationId, createdBy: req.user._id });
    return sendSuccess(res, 'Offer created successfully.', offer, 201);
  } catch (error) {
    if (error.code === 11000) return sendError(res, 'A coupon with this code already exists in your workspace.', 409);
    return next(error);
  }
};

const updateOffer = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid offer ID.', 400);
    const existing = await Offer.findOne({ _id: req.params.id, organizationId: req.organizationId });
    if (!existing) return sendError(res, 'Offer not found.', 404);
    const parsed = validateOfferPayload(req.body, await getOrganizationTimeZone(req.organizationId));
    if (!parsed.valid) return sendError(res, parsed.message, 400);
    if (!(await validateServiceOwnership(parsed.value.serviceIds, req.organizationId))) {
      return sendError(res, 'One or more selected services are invalid or inactive.', 400);
    }
    Object.assign(existing, parsed.value);
    await existing.save();
    return sendSuccess(res, 'Offer updated successfully.', existing);
  } catch (error) {
    if (error.code === 11000) return sendError(res, 'A coupon with this code already exists in your workspace.', 409);
    return next(error);
  }
};

const updateOfferStatus = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid offer ID.', 400);
    if (typeof req.body?.isActive !== 'boolean') return sendError(res, 'isActive must be true or false.', 400);
    const offer = await Offer.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId },
      { isActive: req.body.isActive },
      { new: true, runValidators: true }
    );
    if (!offer) return sendError(res, 'Offer not found.', 404);
    return sendSuccess(res, req.body.isActive ? 'Offer activated.' : 'Offer deactivated.', offer);
  } catch (error) { return next(error); }
};

module.exports = { getOffers, createOffer, updateOffer, updateOfferStatus };
