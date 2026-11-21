const { verifyAccessToken } = require('../utils/tokens');
const User = require('../models/User');
const Organization = require('../models/Organization');
const { sendError } = require('../utils/response');
const { isAllowedEmail, getEmailPolicyMessage } = require('../utils/businessEmail');
const { isAuthVersionCurrent } = require('../utils/authSession');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
      return sendError(res, 'Access token required', 401);

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.id).select('+isActive');
    if (!user || !user.isActive)
      return sendError(res, 'User not found or inactive', 401);
    if (!isAuthVersionCurrent(decoded.authVersion, user.authVersion))
      return sendError(res, 'Session expired. Please sign in again.', 401);

    // Enforce organization suspension immediately for already-issued access tokens.
    // A successful login check alone is not enough because access tokens can remain valid.
    const organization = await Organization.findById(user.organizationId).select('active isPlatformOrganization');
    if (!organization || !organization.active) {
      return sendError(res, 'This organization is suspended or inactive. Contact platform support.', 403);
    }

    // Enforce the configured email policy for existing sessions, not only new logins.
    if (!isAllowedEmail(user.email))
      return sendError(res, getEmailPolicyMessage(), 403);

    req.user = user;
    req.organizationId = user.organizationId;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return sendError(res, 'Token expired', 401);
    if (['JsonWebTokenError', 'NotBeforeError'].includes(err.name))
      return sendError(res, 'Invalid token', 401);
    return next(err);
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return sendError(res, 'Access denied: insufficient permissions', 403);
    next();
  };
};

// Ensure tenant isolation
const tenantGuard = (req, res, next) => {
  if (!req.organizationId)
    return sendError(res, 'Organization context missing', 400);
  next();
};

module.exports = { authenticate, authorize, tenantGuard };
