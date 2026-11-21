const mongoose = require('mongoose');

const loyaltyTransactionSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
  type: { type: String, enum: ['earned', 'redeemed', 'refund', 'adjustment'], required: true },
  points: { type: Number, required: true }, // Positive for credits, negative for debits.
  balanceAfter: { type: Number, min: 0, default: null },
  description: { type: String, required: true, trim: true, maxlength: 240 },
  idempotencyKey: { type: String, required: true, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

loyaltyTransactionSchema.index({ organizationId: 1, customerId: 1, createdAt: -1 });
loyaltyTransactionSchema.index({ organizationId: 1, idempotencyKey: 1 }, { unique: true });

module.exports = mongoose.model('LoyaltyTransaction', loyaltyTransactionSchema);
