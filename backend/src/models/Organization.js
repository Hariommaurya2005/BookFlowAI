const mongoose = require('mongoose');

const cancellationPolicySchema = new mongoose.Schema({
  windowHours: { type: Number, min: 1, max: 720, default: 24 },
}, { _id: false });

const subscriptionSchema = new mongoose.Schema({
  plan: { type: String, enum: ['free', 'starter', 'pro'], default: 'free' },
  status: { type: String, enum: ['trial', 'active', 'grace_period', 'expired', 'suspended'], default: 'active' },
  isDemo: { type: Boolean, default: true },
  startedAt: { type: Date, default: Date.now },
  periodEndsAt: { type: Date, default: null },
  trialEndsAt: { type: Date, default: null },
  gracePeriodEndsAt: { type: Date, default: null },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  lastUpdatedReason: { type: String, default: '', trim: true, maxlength: 500 },
}, { _id: false });

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Internal platform tenant used only to satisfy the shared user model for Super Admins.
    // It must never appear in public business listings or public booking pages.
    isPlatformOrganization: { type: Boolean, default: false, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    logo: { type: String, default: null },
    // Stable public-facing identifier used by the customer booking page.
    slug: { type: String, lowercase: true, trim: true, unique: true, sparse: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
    publicBookingEnabled: { type: Boolean, default: true },
    cancellationPolicy: { type: cancellationPolicySchema, default: () => ({}) },
    businessType: {
      type: String,
      enum: ['clinic', 'salon', 'consultant', 'repair', 'coaching', 'other'],
      default: 'other',
    },
    subscriptionPlan: {
      type: String,
      enum: ['free', 'starter', 'pro', 'enterprise'],
      default: 'free',
    },
    subscriptionExpiry: { type: Date, default: null },
    // Demo subscription lifecycle; no payment provider is connected in this portfolio version.
    subscription: { type: subscriptionSchema, default: () => ({}) },
    active: { type: Boolean, default: true },
    settings: {
      workingHours: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '18:00' },
      },
      slotDuration: { type: Number, default: 30 },
      timezone: { type: String, default: 'Asia/Kolkata' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Organization', organizationSchema);
