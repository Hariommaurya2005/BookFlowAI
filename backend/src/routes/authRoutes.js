const express = require('express');
const router = express.Router();
const { register, login, refreshToken, logout, forgotPassword, resetPassword, verifyEmail, getMe } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);
router.get('/verify-email/:token', verifyEmail);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

module.exports = router;
