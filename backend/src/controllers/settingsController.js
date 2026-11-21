const Organization = require('../models/Organization');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/response');
const { isValidTimeZone } = require('../utils/appointmentTime');
const { createOrganizationSlug } = require('../utils/publicBookingRules');

const getSettings = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.organizationId);
    if (!org) return sendError(res, 'Organization not found', 404);
    sendSuccess(res, 'Settings retrieved', org);
  } catch (err) { next(err); }
};

const updateSettings = async (req, res, next) => {
  try {
    const { name, email, phone, businessType, settings } = req.body;
    if (settings?.timezone && !isValidTimeZone(settings.timezone)) {
      return sendError(res, 'Timezone must be a valid IANA timezone, such as Asia/Kolkata.', 400);
    }
    const org = await Organization.findByIdAndUpdate(
      req.organizationId,
      { name, email, phone, businessType, settings },
      { new: true, runValidators: true }
    );
    if (!org) return sendError(res, 'Organization not found', 404);
    sendSuccess(res, 'Settings updated', org);
  } catch (err) { next(err); }
};


const getCancellationPolicy = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.organizationId).select('cancellationPolicy');
    if (!org) return sendError(res, 'Organization not found', 404);
    const windowHours = Number(org.cancellationPolicy?.windowHours) || 24;
    sendSuccess(res, 'Cancellation policy retrieved', { windowHours });
  } catch (err) { next(err); }
};

const updateCancellationPolicy = async (req, res, next) => {
  try {
    const windowHours = Number(req.body?.windowHours);
    if (!Number.isInteger(windowHours) || windowHours < 1 || windowHours > 720) {
      return sendError(res, 'Cancellation window must be a whole number between 1 and 720 hours.', 400);
    }
    const org = await Organization.findById(req.organizationId);
    if (!org) return sendError(res, 'Organization not found', 404);
    if (!org.cancellationPolicy) org.cancellationPolicy = {};
    if (!org.cancellationPolicy) org.cancellationPolicy = {};
    org.cancellationPolicy.windowHours = windowHours;
    await org.save();
    sendSuccess(res, 'Cancellation policy updated', { windowHours: org.cancellationPolicy.windowHours });
  } catch (err) { next(err); }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, avatar } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name, avatar }, { new: true });
    sendSuccess(res, 'Profile updated', user);
  } catch (err) { next(err); }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return sendError(res, 'New password must be at least 8 characters long.', 400);
    }
    if (typeof currentPassword !== 'string' || !currentPassword) {
      return sendError(res, 'Current password is required.', 400);
    }
    const user = await User.findById(req.user._id).select('+password +refreshToken');
    if (!user) return sendError(res, 'User not found.', 404);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return sendError(res, 'Current password incorrect', 400);
    user.password = newPassword;
    user.authVersion = (user.authVersion || 0) + 1;
    user.refreshToken = null;
    await user.save();
    sendSuccess(res, 'Password changed successfully');
  } catch (err) { next(err); }
};



const getPublicBookingSettings = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.organizationId);
    if (!org) return sendError(res, 'Organization not found', 404);

    // Backfill a stable slug for organizations created before public booking was added.
    if (!org.slug) org.slug = createOrganizationSlug(org.name, org._id);
    if (typeof org.publicBookingEnabled !== 'boolean') org.publicBookingEnabled = true;
    await org.save();

    const frontendUrl = String(process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    sendSuccess(res, 'Public booking settings retrieved', {
      slug: org.slug,
      enabled: org.publicBookingEnabled,
      url: `${frontendUrl}/book/${org.slug}`,
    });
  } catch (err) { next(err); }
};

const updatePublicBookingSettings = async (req, res, next) => {
  try {
    if (typeof req.body?.enabled !== 'boolean') {
      return sendError(res, 'enabled must be true or false.', 400);
    }
    const org = await Organization.findById(req.organizationId);
    if (!org) return sendError(res, 'Organization not found', 404);
    if (!org.slug) org.slug = createOrganizationSlug(org.name, org._id);
    org.publicBookingEnabled = req.body.enabled;
    await org.save();

    const frontendUrl = String(process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    sendSuccess(res, req.body.enabled ? 'Public booking enabled.' : 'Public booking disabled.', {
      slug: org.slug,
      enabled: org.publicBookingEnabled,
      url: `${frontendUrl}/book/${org.slug}`,
    });
  } catch (err) { next(err); }
};

module.exports = { getSettings, updateSettings, updateProfile, changePassword, getPublicBookingSettings, updatePublicBookingSettings, getCancellationPolicy, updateCancellationPolicy };
