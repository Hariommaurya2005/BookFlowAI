const express = require('express');
const router = express.Router();
const { authenticate, tenantGuard, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');
const { requireEntitlement } = require('../middleware/subscriptionEntitlement');
const {
  getAvailableSlots, createAppointment, getAppointments,
  updateAppointmentStatus, rescheduleAppointment, decideCancellationRequest, deleteAppointment,
} = require('../controllers/appointmentController');

router.use(authenticate, tenantGuard);

router.get('/slots', getAvailableSlots);
router.get('/', getAppointments);
router.post('/', requireEntitlement('booking'), auditLog('CREATE', 'appointment'), createAppointment);
router.put('/:id/status', auditLog('UPDATE', 'appointment'), updateAppointmentStatus);
router.put('/:id/reschedule', requireEntitlement('write'), auditLog('UPDATE', 'appointment'), rescheduleAppointment);
router.put('/:id/cancellation-request', authorize('business_owner', 'receptionist', 'super_admin'), auditLog('UPDATE', 'appointment'), decideCancellationRequest);
router.delete('/:id', auditLog('DELETE', 'appointment'), deleteAppointment);

module.exports = router;
