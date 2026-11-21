const express = require('express');
const router = express.Router();
const { authenticate, tenantGuard } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');
const { requireEntitlement } = require('../middleware/subscriptionEntitlement');
const { getStaff, getStaffMember, createStaff, updateStaff, addLeave, removeLeave, deleteStaff } = require('../controllers/staffController');

router.use(authenticate, tenantGuard);
router.get('/', getStaff);
router.get('/:id', getStaffMember);
router.post('/', requireEntitlement('staff'), auditLog('CREATE', 'staff'), createStaff);
router.put('/:id', requireEntitlement('write'), auditLog('UPDATE', 'staff'), updateStaff);
router.post('/:id/leave', requireEntitlement('write'), auditLog('UPDATE', 'staff'), addLeave);
router.delete('/:id/leave', requireEntitlement('write'), auditLog('UPDATE', 'staff'), removeLeave);
router.delete('/:id', auditLog('DELETE', 'staff'), deleteStaff);

module.exports = router;
