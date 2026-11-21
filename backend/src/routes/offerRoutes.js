const express = require('express');
const router = express.Router();
const { authenticate, tenantGuard, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');
const { requireEntitlement, requireOfferStatusEntitlement } = require('../middleware/subscriptionEntitlement');
const { getOffers, createOffer, updateOffer, updateOfferStatus } = require('../controllers/offerController');

router.use(authenticate, tenantGuard);
router.get('/', getOffers);
router.post('/', authorize('business_owner', 'super_admin'), requireEntitlement('offer'), auditLog('CREATE', 'offer'), createOffer);
router.put('/:id', authorize('business_owner', 'super_admin'), requireEntitlement('write'), auditLog('UPDATE', 'offer'), updateOffer);
router.patch('/:id/status', authorize('business_owner', 'super_admin'), requireOfferStatusEntitlement, auditLog('UPDATE', 'offer'), updateOfferStatus);

module.exports = router;
