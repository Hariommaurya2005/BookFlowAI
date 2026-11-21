const express = require('express');
const router = express.Router();
const { authenticate, tenantGuard } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');
const { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer } = require('../controllers/customerController');

router.use(authenticate, tenantGuard);
router.get('/', getCustomers);
router.get('/:id', getCustomer);
router.post('/', auditLog('CREATE', 'customer'), createCustomer);
router.put('/:id', auditLog('UPDATE', 'customer'), updateCustomer);
router.delete('/:id', auditLog('DELETE', 'customer'), deleteCustomer);

module.exports = router;
