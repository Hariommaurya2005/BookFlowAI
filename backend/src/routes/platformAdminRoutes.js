const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getOverview, listOrganizations, updateOrganizationStatus, updateOrganizationSubscription, listAuditLogs } = require('../controllers/platformAdminController');

// Every route in this router requires a server-authorized platform Super Admin.
router.use(authenticate, authorize('super_admin'));
router.get('/overview', getOverview);
router.get('/organizations', listOrganizations);
router.patch('/organizations/:organizationId/status', updateOrganizationStatus);
router.patch('/organizations/:organizationId/subscription', updateOrganizationSubscription);
router.get('/audit-logs', listAuditLogs);

module.exports = router;
