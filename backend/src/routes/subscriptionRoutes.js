const express = require('express');
const router = express.Router();
const { authenticate, tenantGuard, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');
const { getMySubscription, selectDemoPlan } = require('../controllers/subscriptionController');

router.use(authenticate, tenantGuard);
router.get('/me', authorize('business_owner'), getMySubscription);
router.post('/demo/select-plan', authorize('business_owner'), auditLog('UPDATE', 'subscription'), selectDemoPlan);
module.exports = router;
