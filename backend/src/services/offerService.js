const Offer = require('../models/Offer');
const Customer = require('../models/Customer');
const Appointment = require('../models/Appointment');
const { normalizeOfferCode, calculateOfferDiscount } = require('../utils/offerRules');

const offerError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

const findCustomerByContact = async ({ organizationId, email, phone }) => {
  const conditions = [];
  if (email) conditions.push({ email: String(email).trim().toLowerCase() });
  if (phone) conditions.push({ phone: String(phone).trim().replace(/\s+/g, ' ') });
  if (!conditions.length) return null;
  const matches = await Customer.find({ organizationId, $or: conditions }).limit(3).select('_id name email phone isActive').lean();
  const uniqueMatches = new Map(matches.map((item) => [String(item._id), item]));
  if (uniqueMatches.size > 1) throw offerError('These contact details match different customer records. Please contact the business before applying a coupon.', 409);
  return uniqueMatches.values().next().value || null;
};

const evaluateOffer = async ({ organizationId, service, code, email = '', phone = '', customer = null, now = new Date() }) => {
  const normalizedCode = normalizeOfferCode(code);
  if (!normalizedCode) throw offerError('Enter a coupon code.');
  const offer = await Offer.findOne({ organizationId, code: normalizedCode, isActive: true });
  if (!offer) throw offerError('This coupon code is not valid.', 404);
  if (offer.validFrom > now) throw offerError('This coupon is not active yet.');
  if (offer.validUntil < now) throw offerError('This coupon has expired.');
  if (offer.usageLimit !== null && offer.usageLimit !== undefined && offer.redemptionCount >= offer.usageLimit) {
    throw offerError('This coupon has reached its usage limit.', 409);
  }
  if (offer.serviceIds?.length && !offer.serviceIds.some((id) => String(id) === String(service._id))) {
    throw offerError('This coupon is not valid for the selected service.');
  }
  const price = Number(service.price);
  if (price < Number(offer.minimumBookingAmount || 0)) {
    throw offerError(`This coupon requires a minimum booking value of ₹${Number(offer.minimumBookingAmount).toLocaleString('en-IN')}.`);
  }

  let matchedCustomer = customer;
  if (!matchedCustomer) matchedCustomer = await findCustomerByContact({ organizationId, email, phone });
  if (matchedCustomer && !matchedCustomer.isActive) throw offerError('This customer account cannot use the coupon.', 409);

  if (offer.firstVisitOnly && matchedCustomer) {
    const previousBooking = await Appointment.exists({
      organizationId,
      customerId: matchedCustomer._id,
      status: { $nin: ['cancelled'] },
    });
    if (previousBooking) throw offerError('This coupon is only available for a first booking with this business.');
  } else if (offer.firstVisitOnly && !email && !phone) {
    throw offerError('Enter your email or phone number to verify first-visit eligibility.');
  }

  if (matchedCustomer && Number(offer.maxRedemptionsPerCustomer || 1) > 0) {
    const priorRedemptions = await Appointment.countDocuments({
      organizationId,
      customerId: matchedCustomer._id,
      offerId: offer._id,
    });
    if (priorRedemptions >= Number(offer.maxRedemptionsPerCustomer || 1)) {
      throw offerError('This customer has already used this coupon the maximum number of times.');
    }
  }

  const totals = calculateOfferDiscount({
    price,
    discountType: offer.discountType,
    discountValue: offer.discountValue,
    maxDiscountAmount: offer.maxDiscountAmount,
  });
  if (totals.discountAmount <= 0) throw offerError('This coupon does not apply a discount to the selected service.');
  return { offer, customer: matchedCustomer, ...totals };
};

const reserveOfferRedemption = async ({ offerId, organizationId, usageLimit }) => {
  const query = { _id: offerId, organizationId, isActive: true };
  if (usageLimit !== null && usageLimit !== undefined) query.redemptionCount = { $lt: usageLimit };
  return Offer.findOneAndUpdate(query, { $inc: { redemptionCount: 1 } }, { new: true });
};

const releaseOfferRedemption = async ({ offerId, organizationId }) => {
  await Offer.updateOne({ _id: offerId, organizationId, redemptionCount: { $gt: 0 } }, { $inc: { redemptionCount: -1 } });
};

module.exports = { evaluateOffer, reserveOfferRedemption, releaseOfferRedemption, offerError };
