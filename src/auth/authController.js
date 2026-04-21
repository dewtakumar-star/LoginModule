const express = require('express');
const { login, verifyAccessToken } = require('./authService');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Bad Request', message: 'username and password are required.' });
  }
  try {
    const result = login(username, password);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized', message: err.message });
  }
});

router.get('/me', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing or malformed Authorization header.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    return res.status(200).json({ sub: decoded.sub, username: decoded.username, roles: decoded.roles, iat: decoded.iat, exp: decoded.exp });
  } catch (err) {
    const isExpired = err.name === 'TokenExpiredError';
    return res.status(401).json({ error: 'Unauthorized', message: isExpired ? 'Token has expired.' : 'Invalid token.' });
  }
});

module.exports = router;
