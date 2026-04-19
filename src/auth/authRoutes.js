const express = require('express');
const { login } = require('./authController');

const router = express.Router();

/**
 * @route   POST /auth/login
 * @desc    Authenticate user and return JWT
 * @access  Public
 */
router.post('/login', login);

module.exports = router;
