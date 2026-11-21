const express = require('express');
const router = express.Router();
const { authenticate, tenantGuard } = require('../middleware/auth');
const { requireEntitlement } = require('../middleware/subscriptionEntitlement');
const { smartSuggest, customerSummary, dashboardInsights, staffSummary, offerRecommendations, customerRetention } = require('../controllers/aiController');

router.use(authenticate, tenantGuard);
router.post('/suggest', requireEntitlement('ai'), smartSuggest);
router.get('/customer-summary/:customerId', requireEntitlement('ai'), customerSummary);
router.get('/insights', requireEntitlement('ai'), dashboardInsights);
router.get('/staff-summary/:staffId', requireEntitlement('advancedAI'), staffSummary);
router.get('/offer-recommendations', requireEntitlement('advancedAI'), offerRecommendations);
router.get('/retention', requireEntitlement('advancedAI'), customerRetention);

module.exports = router;
