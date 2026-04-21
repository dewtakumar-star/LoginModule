const express = require('express');
const router = express.Router();
const { loginRateLimiter, passwordResetRateLimiter } = require('../middleware/rateLimiter');

router.post('/login', loginRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Bad Request', message: 'email and password are required.' });
    }
    const isValid = email === 'user@example.com' && password === 'correctpassword';
    if (!isValid) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password.' });
    }
    return res.status(200).json({ message: 'Login successful.', token: 'jwt-token-placeholder' });
  } catch (err) {
    console.error('[POST /auth/login] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/password-reset', passwordResetRateLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Bad Request', message: 'email is required.' });
    }
    return res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (err) {
    console.error('[POST /auth/password-reset] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
