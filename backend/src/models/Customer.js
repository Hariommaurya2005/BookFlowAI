const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    notes: { type: String, default: '' },
    totalBookings: { type: Number, default: 0 },
    loyaltyPoints: { type: Number, default: 0, min: 0 },
    lifetimeLoyaltyPoints: { type: Number, default: 0, min: 0 },
    lastVisit: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

customerSchema.index({ organizationId: 1 });
customerSchema.index({ organizationId: 1, phone: 1 });

module.exports = mongoose.model('Customer', customerSchema);
