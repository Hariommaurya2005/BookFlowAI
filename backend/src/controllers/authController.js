const crypto = require('crypto');
const User = require('../models/User');
const Organization = require('../models/Organization');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/tokens');
const { sendSuccess, sendError } = require('../utils/response');
const { sendPasswordReset, sendEmailVerification } = require('../services/emailService');
const AuditLog = require('../models/AuditLog');
const { isAllowedEmail, isWorkEmailRequired, getEmailPolicyMessage } = require('../utils/businessEmail');
const { createOrganizationSlug } = require('../utils/publicBookingRules');
const { isAuthVersionCurrent } = require('../utils/authSession');

const register = async (req, res, next) => {
  try {
    const { orgName, orgEmail, orgPhone, businessType, name, email, password } = req.body;
    const normalizedOrgEmail = String(orgEmail || '').trim().toLowerCase();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!isAllowedEmail(normalizedOrgEmail) || !isAllowedEmail(normalizedEmail)) {
      return sendError(res, isWorkEmailRequired()
        ? 'Please use valid work email addresses with your organization domain.'
        : getEmailPolicyMessage(), 400);
    }
    if (!orgName?.trim() || !name?.trim() || !password || String(password).length < 8) {
      return sendError(res, 'Organization name, your name, and a password of at least 8 characters are required.', 400);
    }

    const [existingOrg, existingUser] = await Promise.all([
      Organization.findOne({ email: normalizedOrgEmail }),
      User.findOne({ email: normalizedEmail }),
    ]);
    if (existingOrg) return sendError(res, 'Organization email already registered', 409);
    if (existingUser) return sendError(res, 'This email is already registered. Please sign in instead.', 409);

    const org = await Organization.create({
      name: orgName,
      email: normalizedOrgEmail,
      phone: orgPhone,
      businessType,
      publicBookingEnabled: true,
    });
    org.slug = createOrganizationSlug(org.name, org._id);
    await org.save();

    const emailToken = crypto.randomBytes(32).toString('hex');
    const user = await User.create({
      organizationId: org._id,
      name,
      email: normalizedEmail,
      password,
      role: 'business_owner',
      emailVerificationToken: crypto.createHash('sha256').update(emailToken).digest('hex'),
      emailVerificationExpiry: Date.now() + 24 * 60 * 60 * 1000,
    });

    const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${emailToken}`;
    try { await sendEmailVerification(normalizedEmail, verifyUrl); } catch (error) {
      // Registration is retained even if the SMTP provider is not configured; report setup needs in server logs.
      console.warn('[Email] Verification message could not be sent:', error.message);
    }

    const accessToken = generateAccessToken({ id: user._id, role: user.role, org: org._id, authVersion: user.authVersion || 0 });
    const refreshToken = generateRefreshToken({ id: user._id, authVersion: user.authVersion || 0 });

    await User.findByIdAndUpdate(user._id, { refreshToken });

    sendSuccess(res, 'Registration successful. Please verify your email.', {
      accessToken,
      refreshToken,
      user: { ...user.toJSON(), organizationId: org._id },
      organization: org,
    }, 201);
  } catch (err) { next(err); }
};

const login = async (req, res, next) => {
  try {
    const { email: submittedEmail, password, orgId } = req.body;
    const email = String(submittedEmail || '').trim().toLowerCase();
    if (!isAllowedEmail(email)) {
      return sendError(res, getEmailPolicyMessage(), 400);
    }
    if (!password) return sendError(res, 'Password is required.', 400);

    const query = orgId
      ? { email, organizationId: orgId }
      : { email };

    const user = await User.findOne(query).select('+password +refreshToken');
    if (!user) return sendError(res, 'Invalid credentials', 401);
    if (!user.isActive) return sendError(res, 'Account is deactivated', 403);

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return sendError(res, 'Invalid credentials', 401);

    const org = await Organization.findById(user.organizationId);
    if (!org || !org.active) return sendError(res, 'Organization inactive', 403);

    const accessToken = generateAccessToken({ id: user._id, role: user.role, org: user.organizationId, authVersion: user.authVersion || 0 });
    const refreshToken = generateRefreshToken({ id: user._id, authVersion: user.authVersion || 0 });

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    await AuditLog.create({
      organizationId: user.organizationId,
      userId: user._id,
      action: 'LOGIN',
      resource: 'auth',
      description: 'User logged in',
      ipAddress: req.ip,
    });

    sendSuccess(res, 'Login successful', {
      accessToken,
      refreshToken,
      user: user.toJSON(),
      organization: org,
    });
  } catch (err) { next(err); }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return sendError(res, 'Refresh token required', 400);

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || !user.isActive || user.refreshToken !== token || !isAuthVersionCurrent(decoded.authVersion, user.authVersion))
      return sendError(res, 'Invalid refresh token', 401);

    const organization = await Organization.findById(user.organizationId).select('active');
    if (!organization || !organization.active) {
      return sendError(res, 'This organization is suspended or inactive. Contact platform support.', 403);
    }

    const accessToken = generateAccessToken({ id: user._id, role: user.role, org: user.organizationId, authVersion: user.authVersion || 0 });
    const newRefreshToken = generateRefreshToken({ id: user._id, authVersion: user.authVersion || 0 });

    user.refreshToken = newRefreshToken;
    await user.save();

    sendSuccess(res, 'Tokens refreshed', { accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    if (err.name === 'TokenExpiredError') return sendError(res, 'Refresh token expired. Please login again.', 401);
    if (['JsonWebTokenError', 'NotBeforeError'].includes(err.name)) return sendError(res, 'Invalid refresh token.', 401);
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $set: { refreshToken: null }, $inc: { authVersion: 1 } });
    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'LOGOUT',
      resource: 'auth',
    });
    sendSuccess(res, 'Logged out successfully');
  } catch (err) { next(err); }
};

const forgotPassword = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!isAllowedEmail(email)) {
      return sendError(res, getEmailPolicyMessage(), 400);
    }
    const user = await User.findOne({ email });
    if (!user) return sendSuccess(res, 'If email exists, reset link sent.');

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpiry = Date.now() + 60 * 60 * 1000;
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    try {
      await sendPasswordReset(email, resetUrl);
    } catch (error) {
      return sendError(res, 'Password reset email could not be sent. Check the backend SMTP configuration.', 503);
    }

    sendSuccess(res, 'Password reset email sent.');
  } catch (err) { next(err); }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    if (typeof password !== 'string' || password.length < 8) {
      return sendError(res, 'Password must be at least 8 characters long.', 400);
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpiry: { $gt: Date.now() },
    });
    if (!user) return sendError(res, 'Invalid or expired reset token', 400);

    user.password = password;
    user.authVersion = (user.authVersion || 0) + 1;
    user.refreshToken = null;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    sendSuccess(res, 'Password reset successful. Please login.');
  } catch (err) { next(err); }
};

const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpiry: { $gt: Date.now() },
    });
    if (!user) return sendError(res, 'Invalid or expired verification link', 400);

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;
    await user.save();

    sendSuccess(res, 'Email verified successfully.');
  } catch (err) { next(err); }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const org = await Organization.findById(req.organizationId);
    sendSuccess(res, 'User profile', { user, organization: org });
  } catch (err) { next(err); }
};

module.exports = { register, login, refreshToken, logout, forgotPassword, resetPassword, verifyEmail, getMe };
