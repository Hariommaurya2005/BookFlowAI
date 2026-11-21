const { getZonedDateTimeInstant } = require('./appointmentTime');

const normalizeOfferCode = (code) => String(code || '').trim().toUpperCase();

const isValidOfferCode = (code) => /^[A-Z0-9][A-Z0-9_-]{2,29}$/.test(normalizeOfferCode(code));

const calculateOfferDiscount = ({ price, discountType, discountValue, maxDiscountAmount = null }) => {
  const amount = Number(price);
  const value = Number(discountValue);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Booking price must be a valid non-negative number.');
  if (!Number.isFinite(value) || value <= 0) throw new Error('Discount value must be greater than zero.');

  let discount;
  if (discountType === 'percentage') {
    if (value > 100) throw new Error('Percentage discount cannot exceed 100%.');
    discount = amount * value / 100;
    if (maxDiscountAmount !== null && maxDiscountAmount !== undefined && maxDiscountAmount !== '') {
      const cap = Number(maxDiscountAmount);
      if (!Number.isFinite(cap) || cap < 0) throw new Error('Maximum discount must be a non-negative number.');
      discount = Math.min(discount, cap);
    }
  } else if (discountType === 'fixed') {
    discount = value;
  } else {
    throw new Error('Unsupported discount type.');
  }

  const discountAmount = Math.round(Math.min(amount, discount) * 100) / 100;
  const finalPrice = Math.round(Math.max(0, amount - discountAmount) * 100) / 100;
  return { basePrice: Math.round(amount * 100) / 100, discountAmount, finalPrice };
};

const parseOfferDate = (value, endOfDay = false, timeZone = 'Asia/Kolkata') => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const localTime = endOfDay ? '23:59' : '00:00';
    const instant = getZonedDateTimeInstant(value, localTime, timeZone);
    return endOfDay ? new Date(instant.getTime() + 59999) : instant;
  }
  return new Date(value);
};

const validateOfferPayload = (payload = {}, timeZone = 'Asia/Kolkata') => {
  const name = String(payload.name || '').trim();
  const code = normalizeOfferCode(payload.code);
  const description = String(payload.description || '').trim();
  const discountType = payload.discountType;
  const discountValue = Number(payload.discountValue);
  const minimumBookingAmount = payload.minimumBookingAmount === '' || payload.minimumBookingAmount == null ? 0 : Number(payload.minimumBookingAmount);
  const maxDiscountAmount = payload.maxDiscountAmount === '' || payload.maxDiscountAmount == null ? null : Number(payload.maxDiscountAmount);
  const usageLimit = payload.usageLimit === '' || payload.usageLimit == null ? null : Number(payload.usageLimit);
  const maxRedemptionsPerCustomer = payload.maxRedemptionsPerCustomer === '' || payload.maxRedemptionsPerCustomer == null ? 1 : Number(payload.maxRedemptionsPerCustomer);
  const validFrom = payload.validFrom ? parseOfferDate(payload.validFrom, false, timeZone) : new Date();
  const validUntil = parseOfferDate(payload.validUntil, true, timeZone);
  const serviceIds = Array.isArray(payload.serviceIds) ? [...new Set(payload.serviceIds.map(String))] : [];

  if (!name || name.length > 100) return { valid: false, message: 'Offer name is required and must be 100 characters or fewer.' };
  if (!isValidOfferCode(code)) return { valid: false, message: 'Coupon code must be 3–30 characters and use letters, numbers, hyphens or underscores.' };
  if (description.length > 500) return { valid: false, message: 'Offer description must be 500 characters or fewer.' };
  if (!['percentage', 'fixed'].includes(discountType)) return { valid: false, message: 'Choose a percentage or fixed discount.' };
  if (!Number.isFinite(discountValue) || discountValue <= 0 || (discountType === 'percentage' && discountValue > 100)) {
    return { valid: false, message: discountType === 'percentage' ? 'Percentage discount must be greater than 0 and at most 100.' : 'Discount amount must be greater than zero.' };
  }
  if (!Number.isFinite(minimumBookingAmount) || minimumBookingAmount < 0) return { valid: false, message: 'Minimum booking amount must be zero or more.' };
  if (maxDiscountAmount !== null && (!Number.isFinite(maxDiscountAmount) || maxDiscountAmount < 0)) return { valid: false, message: 'Maximum discount must be zero or more.' };
  if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit < 1)) return { valid: false, message: 'Usage limit must be a positive whole number or left empty.' };
  if (!Number.isInteger(maxRedemptionsPerCustomer) || maxRedemptionsPerCustomer < 1 || maxRedemptionsPerCustomer > 100) return { valid: false, message: 'Per-customer redemption limit must be between 1 and 100.' };
  if (!Number.isFinite(validFrom.getTime()) || !Number.isFinite(validUntil.getTime()) || validUntil <= validFrom) return { valid: false, message: 'Enter a valid date range; end date must be after the start date.' };
  return {
    valid: true,
    value: { name, code, description, discountType, discountValue, minimumBookingAmount, maxDiscountAmount, usageLimit, maxRedemptionsPerCustomer, validFrom, validUntil, serviceIds, firstVisitOnly: payload.firstVisitOnly === true || payload.firstVisitOnly === 'true', showOnPublicPage: !(payload.showOnPublicPage === false || payload.showOnPublicPage === 'false') },
  };
};

module.exports = { normalizeOfferCode, isValidOfferCode, calculateOfferDiscount, validateOfferPayload, parseOfferDate };
