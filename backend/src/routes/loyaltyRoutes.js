const express = require('express');
const router = express.Router();
const { authenticate, tenantGuard } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');
const { getOverview, getCustomerLoyalty, redeemPoints } = require('../controllers/loyaltyController');

router.use(authenticate, tenantGuard);
router.get('/overview', getOverview);
router.get('/customers/:customerId', getCustomerLoyalty);
router.post('/redeem', auditLog('REDEEM', 'loyalty_points'), redeemPoints);

module.exports = router;
