const express = require('express');
const nodemailer = require('nodemailer');
const { requestPasswordReset } = require('./passwordResetService');

const router = express.Router();

const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

async function findUserByEmail(email) {
  // Replace with real DB call e.g.: return await User.findOne({ where: { email } });
  throw new Error('findUserByEmail: not implemented - wire up your database here');
}

/**
 * POST /auth/forgot-password
 * Body: { email: string }
 */
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  try {
    const result = await requestPasswordReset(
      { findUserByEmail, mailer },
      email.toLowerCase().trim()
    );
    return res.status(200).json(result);
  } catch (err) {
    console.error('[forgot-password] Unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
  }
});

module.exports = router;
