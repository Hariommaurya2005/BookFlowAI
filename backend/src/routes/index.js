// backend/src/routes/index.js
const express = require('express');
const router = express.Router();

router.use('/auth', require('./authRoutes'));
router.use('/platform-admin', require('./platformAdminRoutes'));
router.use('/public/booking', require('./publicBookingRoutes'));
router.use('/appointments', require('./appointmentRoutes'));
router.use('/customers', require('./customerRoutes'));
router.use('/staff', require('./staffRoutes'));
router.use('/services', require('./serviceRoutes'));
router.use('/offers', require('./offerRoutes'));
router.use('/notifications', require('./notificationRoutes'));
router.use('/dashboard', require('./dashboardRoutes'));
router.use('/settings', require('./settingsRoutes'));
router.use('/subscription', require('./subscriptionRoutes'));
router.use('/loyalty', require('./loyaltyRoutes'));
router.use('/ai', require('./aiRoutes'));

module.exports = router;
