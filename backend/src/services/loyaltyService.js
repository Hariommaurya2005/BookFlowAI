const Appointment = require('../models/Appointment');
const Customer = require('../models/Customer');
const LoyaltyTransaction = require('../models/LoyaltyTransaction');
const { calculateEarnedPoints, validateRedemption } = require('../utils/loyaltyRules');

const isDuplicateKeyError = (error) => error?.code === 11000;

async function awardCompletedAppointment(appointment, createdBy = null) {
  if (!appointment || appointment.status !== 'completed') return { awarded: false, points: 0 };
  const points = calculateEarnedPoints(appointment.price);
  if (!points) return { awarded: false, points: 0 };

  const claim = await Appointment.findOneAndUpdate(
    { _id: appointment._id, organizationId: appointment.organizationId, status: 'completed', loyaltyPointsEarnedAt: null },
    { $set: { loyaltyPointsEarned: points, loyaltyPointsEarnedAt: new Date() } },
    { new: true }
  );
  if (!claim) return { awarded: false, points: 0, reason: 'already_awarded' };

  let transaction;
  let credited = false;
  try {
    transaction = await LoyaltyTransaction.create({
      organizationId: appointment.organizationId,
      customerId: appointment.customerId?._id || appointment.customerId,
      appointmentId: appointment._id,
      type: 'earned',
      points,
      description: `Earned from completed appointment (${appointment.appointmentDate.toISOString().slice(0, 10)})`,
      idempotencyKey: `earn:${appointment._id}`,
      createdBy,
    });
    const customer = await Customer.findOneAndUpdate(
      { _id: appointment.customerId?._id || appointment.customerId, organizationId: appointment.organizationId },
      { $inc: { loyaltyPoints: points, lifetimeLoyaltyPoints: points } },
      { new: true }
    );
    if (!customer) throw new Error('Customer record not found while awarding loyalty points.');
    credited = true;
    transaction.balanceAfter = customer.loyaltyPoints;
    await transaction.save();
    return { awarded: true, points, balance: customer.loyaltyPoints };
  } catch (error) {
    if (transaction?._id) await LoyaltyTransaction.deleteOne({ _id: transaction._id }).catch(() => {});
    if (credited) {
      await Customer.updateOne(
        { _id: appointment.customerId?._id || appointment.customerId, organizationId: appointment.organizationId },
        { $inc: { loyaltyPoints: -points, lifetimeLoyaltyPoints: -points } }
      ).catch(() => {});
    }
    await Appointment.updateOne(
      { _id: appointment._id, organizationId: appointment.organizationId, loyaltyPointsEarnedAt: { $ne: null } },
      { $set: { loyaltyPointsEarned: 0, loyaltyPointsEarnedAt: null } }
    ).catch(() => {});
    if (isDuplicateKeyError(error)) return { awarded: false, points: 0, reason: 'already_awarded' };
    throw error;
  }
}

async function redeemAppointmentPoints({ organizationId, customerId, appointmentId, points, createdBy }) {
  const [customer, appointment] = await Promise.all([
    Customer.findOne({ _id: customerId, organizationId, isActive: true }),
    Appointment.findOne({ _id: appointmentId, organizationId, customerId }),
  ]);
  if (!customer) return { error: 'Customer not found.', status: 404 };
  if (!appointment) return { error: 'Appointment not found for this customer.', status: 404 };
  if (!['pending', 'confirmed'].includes(appointment.status)) {
    return { error: 'Points can only be applied to pending or confirmed appointments.', status: 409 };
  }
  if (appointment.loyaltyPointsRedeemed > 0 || appointment.loyaltyDiscountAmount > 0) {
    return { error: 'Loyalty points have already been applied to this appointment.', status: 409 };
  }

  const decision = validateRedemption({ points, balance: customer.loyaltyPoints, payableAmount: appointment.price });
  if (!decision.valid) return { error: decision.error, status: 400, maxRedeemable: decision.maxRedeemable };
  const { discountAmount } = decision.value;
  const previousPrice = appointment.price;
  const updatedAppointment = await Appointment.findOneAndUpdate(
    {
      _id: appointment._id,
      organizationId,
      customerId,
      status: { $in: ['pending', 'confirmed'] },
      $or: [{ loyaltyPointsRedeemed: 0 }, { loyaltyPointsRedeemed: { $exists: false } }],
      price: previousPrice,
    },
    {
      $set: {
        loyaltyPointsRedeemed: decision.value.points,
        loyaltyDiscountAmount: discountAmount,
        price: Math.max(0, Number((previousPrice - discountAmount).toFixed(2))),
      },
    },
    { new: true }
  );
  if (!updatedAppointment) return { error: 'Appointment changed while applying points. Refresh and try again.', status: 409 };

  let debited = false;
  let transaction;
  try {
    const debitedCustomer = await Customer.findOneAndUpdate(
      { _id: customerId, organizationId, loyaltyPoints: { $gte: decision.value.points } },
      { $inc: { loyaltyPoints: -decision.value.points } },
      { new: true }
    );
    if (!debitedCustomer) throw new Error('The customer does not have enough loyalty points. Refresh and try again.');
    debited = true;
    transaction = await LoyaltyTransaction.create({
      organizationId,
      customerId,
      appointmentId,
      type: 'redeemed',
      points: -decision.value.points,
      balanceAfter: debitedCustomer.loyaltyPoints,
      description: `Redeemed on appointment (${appointment.appointmentDate.toISOString().slice(0, 10)})`,
      idempotencyKey: `redeem:${appointmentId}`,
      createdBy,
    });
    return { appointment: updatedAppointment, customer: debitedCustomer, points: decision.value.points, discountAmount };
  } catch (error) {
    if (transaction?._id) await LoyaltyTransaction.deleteOne({ _id: transaction._id }).catch(() => {});
    if (debited) await Customer.updateOne({ _id: customerId, organizationId }, { $inc: { loyaltyPoints: decision.value.points } }).catch(() => {});
    await Appointment.updateOne(
      { _id: appointmentId, organizationId, loyaltyPointsRedeemed: decision.value.points },
      { $set: { loyaltyPointsRedeemed: 0, loyaltyDiscountAmount: 0, price: previousPrice } }
    ).catch(() => {});
    if (isDuplicateKeyError(error)) return { error: 'Loyalty points were already applied to this appointment.', status: 409 };
    if (error.message.includes('does not have enough')) return { error: error.message, status: 409 };
    throw error;
  }
}

async function refundAppointmentRedemption(appointment) {
  if (!appointment || Number(appointment.loyaltyPointsRedeemed || 0) <= 0 || appointment.loyaltyRedemptionRefundedAt) {
    return { refunded: false, points: 0 };
  }
  const points = Number(appointment.loyaltyPointsRedeemed);
  const claim = await Appointment.findOneAndUpdate(
    { _id: appointment._id, organizationId: appointment.organizationId, loyaltyPointsRedeemed: points, loyaltyRedemptionRefundedAt: null },
    { $set: { loyaltyRedemptionRefundedAt: new Date() } },
    { new: true }
  );
  if (!claim) return { refunded: false, points: 0 };

  let transaction;
  let credited = false;
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: appointment.customerId?._id || appointment.customerId, organizationId: appointment.organizationId },
      { $inc: { loyaltyPoints: points } },
      { new: true }
    );
    if (!customer) throw new Error('Customer record not found while refunding loyalty points.');
    credited = true;
    transaction = await LoyaltyTransaction.create({
      organizationId: appointment.organizationId,
      customerId: appointment.customerId?._id || appointment.customerId,
      appointmentId: appointment._id,
      type: 'refund',
      points,
      balanceAfter: customer.loyaltyPoints,
      description: 'Loyalty points returned after appointment cancellation',
      idempotencyKey: `refund:${appointment._id}`,
    });
    return { refunded: true, points, balance: customer.loyaltyPoints };
  } catch (error) {
    if (transaction?._id) await LoyaltyTransaction.deleteOne({ _id: transaction._id }).catch(() => {});
    if (credited) {
      await Customer.updateOne(
        { _id: appointment.customerId?._id || appointment.customerId, organizationId: appointment.organizationId },
        { $inc: { loyaltyPoints: -points } }
      ).catch(() => {});
    }
    await Appointment.updateOne(
      { _id: appointment._id, organizationId: appointment.organizationId, loyaltyRedemptionRefundedAt: { $ne: null } },
      { $set: { loyaltyRedemptionRefundedAt: null } }
    ).catch(() => {});
    throw error;
  }
}

module.exports = { awardCompletedAppointment, redeemAppointmentPoints, refundAppointmentRedemption };
