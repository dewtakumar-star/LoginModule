const express = require('express');
const router = express.Router();
const { resetPassword } = require('../controllers/resetPasswordController');

/**
 * @route  POST /api/auth/reset-password
 * @desc   Validate reset token and set a new password
 * @access Public
 */
router.post('/reset-password', resetPassword);

module.exports = router;
