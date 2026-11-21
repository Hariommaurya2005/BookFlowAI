const Organization = require('../models/Organization');
const { sendError } = require('../utils/response');
const { checkOrganizationEntitlement } = require('../services/subscriptionService');

const requireEntitlement = (feature) => async (req, res, next) => {
  try {
    if (!req.organizationId) return sendError(res, 'Organization context is missing.', 400);
    const organization = await Organization.findById(req.organizationId);
    if (!organization) return sendError(res, 'Organization not found.', 404);
    const decision = await checkOrganizationEntitlement(organization, feature);
    if (!decision.allowed) {
      return sendError(res, decision.message, decision.httpStatus || 403, {
        code: decision.code || 'SUBSCRIPTION_RESTRICTED',
        plan: decision.subscription?.plan,
        status: decision.subscriptionStatus || decision.subscription?.status,
        usage: decision.usage || undefined,
        limit: decision.limit || undefined,
      });
    }
    if (decision.warning) res.setHeader('X-Subscription-Warning', decision.warning);
    req.subscriptionContext = decision;
    next();
  } catch (error) { next(error); }
};

// Reactivating an offer consumes an active-offer slot; deactivation must remain
// available even when the organization has reached its plan limit.
const requireOfferStatusEntitlement = (req, res, next) => {
  const feature = req.body?.isActive === true ? 'offer' : 'write';
  return requireEntitlement(feature)(req, res, next);
};

module.exports = { requireEntitlement, requireOfferStatusEntitlement };
