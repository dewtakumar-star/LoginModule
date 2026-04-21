const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';
const RESET_TOKEN_EXPIRY = '1h';
const CLIENT_BASE_URL = process.env.CLIENT_BASE_URL || 'http://localhost:3000';

function generateResetToken(userId) {
  if (!userId) throw new Error('userId is required to generate a reset token');
  return jwt.sign(
    { sub: userId, purpose: 'password-reset', jti: crypto.randomBytes(16).toString('hex') },
    JWT_SECRET,
    { expiresIn: RESET_TOKEN_EXPIRY }
  );
}

function verifyResetToken(token) {
  if (!token) throw new Error('token is required');
  const payload = jwt.verify(token, JWT_SECRET);
  if (payload.purpose !== 'password-reset') {
    throw new Error('Invalid token purpose');
  }
  return payload;
}

async function sendPasswordResetEmail(mailer, toEmail, token) {
  if (!mailer) throw new Error('mailer is required');
  if (!toEmail) throw new Error('toEmail is required');
  if (!token) throw new Error('token is required');

  const resetLink = `${CLIENT_BASE_URL}/reset-password?token=${encodeURIComponent(token)}`;

  const mailOptions = {
    from: process.env.MAIL_FROM || 'no-reply@example.com',
    to: toEmail,
    subject: 'Password Reset Request',
    text: [
      'You requested a password reset for your account.',
      '',
      `Click the link below to reset your password (valid for 1 hour):`,
      resetLink,
      '',
      'If you did not request this, please ignore this email.',
    ].join('\n'),
    html: `
      <p>You requested a password reset for your account.</p>
      <p>
        <a href="${resetLink}">Reset your password</a>
        (valid for 1&nbsp;hour)
      </p>
      <p>If you did not request this, please ignore this email.</p>
    `,
  };

  return mailer.sendMail(mailOptions);
}

async function requestPasswordReset({ findUserByEmail, mailer }, email) {
  if (!email) throw new Error('email is required');

  const genericResponse = {
    message: 'If an account with that email exists, a reset link has been sent.',
  };

  const user = await findUserByEmail(email);
  if (!user) {
    return genericResponse;
  }

  const token = generateResetToken(user.id);
  await sendPasswordResetEmail(mailer, user.email, token);

  return genericResponse;
}

module.exports = {
  generateResetToken,
  verifyResetToken,
  sendPasswordResetEmail,
  requestPasswordReset,
};
