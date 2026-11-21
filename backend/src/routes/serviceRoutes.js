// serviceRoutes.js
const express = require('express');
const router = express.Router();
const { authenticate, tenantGuard } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');
const { requireEntitlement } = require('../middleware/subscriptionEntitlement');
const { getServices, createService, updateService, deleteService } = require('../controllers/serviceController');

router.use(authenticate, tenantGuard);
router.get('/', getServices);
router.post('/', requireEntitlement('service'), auditLog('CREATE', 'service'), createService);
router.put('/:id', requireEntitlement('write'), auditLog('UPDATE', 'service'), updateService);
router.delete('/:id', auditLog('DELETE', 'service'), deleteService);

module.exports = router;
