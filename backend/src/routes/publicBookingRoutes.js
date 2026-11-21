const express = require('express');
const router = express.Router();
const {
  getPublicBookingPage,
  getPublicAvailableSlots,
  aiSuggestPublicBooking,
  validatePublicCoupon,
  createPublicAppointment,
  getPublicBookingManagement,
  requestPublicCancellation,
} = require('../controllers/publicBookingController');

// These routes intentionally do not require owner authentication. Management routes use an unguessable token hash.
// Register /manage before /:slug because both are single-segment GET paths.
router.get('/manage', getPublicBookingManagement);
router.post('/manage/cancellation-request', requestPublicCancellation);
router.get('/:slug', getPublicBookingPage);
router.get('/:slug/slots', getPublicAvailableSlots);
router.post('/:slug/ai-suggest', aiSuggestPublicBooking);
router.post('/:slug/coupons/validate', validatePublicCoupon);
router.post('/:slug/appointments', createPublicAppointment);

module.exports = router;
