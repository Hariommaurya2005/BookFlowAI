const mongoose = require('mongoose');

const subscriptionUsageSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  monthKey: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
  aiRequests: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

subscriptionUsageSchema.index({ organizationId: 1, monthKey: 1 }, { unique: true });
module.exports = mongoose.model('SubscriptionUsage', subscriptionUsageSchema);
