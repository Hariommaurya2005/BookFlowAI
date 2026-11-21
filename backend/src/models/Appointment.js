const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
    appointmentDate: { type: Date, required: true },
    appointmentTime: { type: String, required: true }, // "HH:MM"
    endTime: { type: String }, // "HH:MM"
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'],
      default: 'pending',
    },
    notes: { type: String, default: '' },
    price: { type: Number, default: 0 }, // final payable price after any offer discount
    basePrice: { type: Number, default: null },
    discountAmount: { type: Number, default: 0, min: 0 },
    loyaltyPointsEarned: { type: Number, default: 0, min: 0 },
    loyaltyPointsEarnedAt: { type: Date, default: null },
    loyaltyPointsRedeemed: { type: Number, default: 0, min: 0 },
    loyaltyDiscountAmount: { type: Number, default: 0, min: 0 },
    loyaltyRedemptionRefundedAt: { type: Date, default: null },
    offerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', default: null },
    couponCode: { type: String, trim: true, uppercase: true, default: null },
    reminderSent: { type: Boolean, default: false },
    // Public booking management uses a one-time-issued bearer token; only its hash is stored.
    bookingManagementTokenHash: { type: String, select: false },
    bookingManagementTokenExpiresAt: { type: Date, default: null },
    cancellationRequestStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none',
    },
    cancellationRequestedAt: { type: Date, default: null },
    cancellationRequestReason: { type: String, default: '', maxlength: 500 },
    cancellationReviewedAt: { type: Date, default: null },
    cancellationReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    cancellationReviewNote: { type: String, default: '', maxlength: 500 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

appointmentSchema.index({ organizationId: 1, appointmentDate: 1 });
appointmentSchema.index({ organizationId: 1, staffId: 1, appointmentDate: 1 });
appointmentSchema.index({ organizationId: 1, customerId: 1 });
appointmentSchema.index({ bookingManagementTokenHash: 1 }, { unique: true, sparse: true });
appointmentSchema.index({ organizationId: 1, cancellationRequestStatus: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
