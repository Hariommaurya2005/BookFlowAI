const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  code: { type: String, required: true, trim: true, uppercase: true, minlength: 3, maxlength: 30 },
  description: { type: String, default: '', trim: true, maxlength: 500 },
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true, min: 0.01 },
  maxDiscountAmount: { type: Number, min: 0, default: null },
  minimumBookingAmount: { type: Number, min: 0, default: 0 },
  serviceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
  firstVisitOnly: { type: Boolean, default: false },
  showOnPublicPage: { type: Boolean, default: true },
  validFrom: { type: Date, required: true, default: Date.now },
  validUntil: { type: Date, required: true },
  usageLimit: { type: Number, min: 1, default: null },
  maxRedemptionsPerCustomer: { type: Number, min: 1, max: 100, default: 1 },
  redemptionCount: { type: Number, min: 0, default: 0 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

offerSchema.index({ organizationId: 1, code: 1 }, { unique: true });
offerSchema.index({ organizationId: 1, isActive: 1, validUntil: 1 });

offerSchema.pre('validate', function (next) {
  this.code = String(this.code || '').trim().toUpperCase();
  if (this.discountType === 'percentage' && (this.discountValue <= 0 || this.discountValue > 100)) {
    this.invalidate('discountValue', 'Percentage discount must be greater than 0 and at most 100.');
  }
  if (this.validFrom && this.validUntil && this.validUntil <= this.validFrom) {
    this.invalidate('validUntil', 'Offer end date must be after the start date.');
  }
  next();
});

module.exports = mongoose.model('Offer', offerSchema);
