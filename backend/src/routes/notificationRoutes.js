const express = require('express');
const router = express.Router();
const { authenticate, tenantGuard } = require('../middleware/auth');
const { getNotifications, readNotification, readAllNotifications } = require('../controllers/notificationController');

router.use(authenticate, tenantGuard);
router.get('/', getNotifications);
router.put('/:id/read', readNotification);
router.put('/read-all', readAllNotifications);

module.exports = router;
