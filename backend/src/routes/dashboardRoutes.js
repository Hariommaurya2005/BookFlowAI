const express = require('express');
const router = express.Router();
const { authenticate, tenantGuard } = require('../middleware/auth');
const { getDashboard, getAnalytics } = require('../controllers/dashboardController');

router.use(authenticate, tenantGuard);
router.get('/', getDashboard);
router.get('/analytics', getAnalytics);

module.exports = router;
