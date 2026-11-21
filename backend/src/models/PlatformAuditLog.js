const mongoose = require('mongoose');

const platformAuditLogSchema = new mongoose.Schema({
  actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetOrganizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  action: { type: String, enum: ['ORGANIZATION_SUSPENDED', 'ORGANIZATION_REACTIVATED', 'SUBSCRIPTION_UPDATED'], required: true },
  reason: { type: String, required: true, trim: true, maxlength: 500 },
  previousActive: { type: Boolean, default: true },
  newActive: { type: Boolean, default: true },
  previousSubscription: { type: mongoose.Schema.Types.Mixed, default: null },
  newSubscription: { type: mongoose.Schema.Types.Mixed, default: null },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '', maxlength: 300 },
}, { timestamps: true });

platformAuditLogSchema.index({ createdAt: -1 });
platformAuditLogSchema.index({ targetOrganizationId: 1, createdAt: -1 });

module.exports = mongoose.model('PlatformAuditLog', platformAuditLogSchema);
