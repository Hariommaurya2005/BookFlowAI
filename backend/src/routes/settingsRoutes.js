const express = require('express');
const router = express.Router();
const { authenticate, tenantGuard, authorize } = require('../middleware/auth');
const { getSettings, updateSettings, updateProfile, changePassword, getPublicBookingSettings, updatePublicBookingSettings, getCancellationPolicy, updateCancellationPolicy } = require('../controllers/settingsController');

router.use(authenticate, tenantGuard);
router.get('/', getSettings);
router.get('/public-booking', getPublicBookingSettings);
router.get('/cancellation-policy', getCancellationPolicy);
router.put('/cancellation-policy', authorize('business_owner', 'super_admin'), updateCancellationPolicy);
router.put('/public-booking', authorize('business_owner', 'super_admin'), updatePublicBookingSettings);
router.put('/', authorize('business_owner', 'super_admin'), updateSettings);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);

module.exports = router;
