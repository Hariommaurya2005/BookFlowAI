const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    specialization: { type: String, trim: true },
    avatar: { type: String, default: null },
    workingHours: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '18:00' },
      days: {
        type: [String],
        default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      },
    },
    leaves: [{ type: Date }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

staffSchema.index({ organizationId: 1 });

module.exports = mongoose.model('Staff', staffSchema);
