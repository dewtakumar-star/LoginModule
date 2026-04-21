const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { findUserByResetToken, updateUserPassword, invalidateResetToken } = require('../models/userModel');

const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Validates password strength.
 * Must be at least 8 characters, contain uppercase, lowercase, digit, and special char.
 */
function validatePassword(password) {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one digit.';
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must contain at least one special character.';
  }
  return null;
}

/**
 * POST /api/auth/reset-password
 * Body: { token: string, password: string, confirmPassword: string }
 */
async function resetPassword(req, res) {
  try {
    const { token, password, confirmPassword } = req.body;

    // --- Basic field presence check ---
    if (!token || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'token, password, and confirmPassword are required.',
      });
    }

    // --- Password match check ---
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.',
      });
    }

    // --- Password strength check ---
    const validationError = validatePassword(password);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    // --- Verify JWT reset token ---
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.RESET_TOKEN_SECRET);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Reset link is invalid or has expired. Please request a new one.',
      });
    }

    // --- Look up user by token ---
    const user = await findUserByResetToken(token);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Reset link is invalid or has already been used.',
      });
    }

    // --- Hash new password ---
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // --- Persist new password and invalidate the token ---
    await updateUserPassword(user.id, hashedPassword);
    await invalidateResetToken(user.id);

    return res.status(200).json({
      success: true,
      message: 'Your password has been reset successfully. You can now log in.',
    });
  } catch (error) {
    console.error('[resetPassword] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred. Please try again later.',
    });
  }
}

module.exports = { resetPassword, validatePassword };
