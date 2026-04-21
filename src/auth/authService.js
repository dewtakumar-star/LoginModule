const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme-super-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_ISSUER = process.env.JWT_ISSUER || 'myapp';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'myapp-client';

const USERS = [
  {
    id: '1',
    username: 'alice',
    passwordHash: crypto.createHash('sha256').update('password123').digest('hex'),
    roles: ['user'],
  },
  {
    id: '2',
    username: 'admin',
    passwordHash: crypto.createHash('sha256').update('adminpass').digest('hex'),
    roles: ['user', 'admin'],
  },
];

function findUserByUsername(username) {
  return USERS.find((u) => u.username === username) || null;
}

function verifyPassword(plainPassword, storedHash) {
  const hash = crypto.createHash('sha256').update(plainPassword).digest('hex');
  return hash === storedHash;
}

function issueAccessToken(userPayload) {
  const payload = {
    sub: userPayload.id,
    username: userPayload.username,
    roles: userPayload.roles,
  };
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    algorithm: 'HS256',
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    algorithms: ['HS256'],
  });
}

function login(username, password) {
  if (!username || !password) {
    throw new Error('Username and password are required.');
  }
  const user = findUserByUsername(username);
  if (!user) {
    throw new Error('Invalid credentials.');
  }
  const passwordValid = verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    throw new Error('Invalid credentials.');
  }
  const accessToken = issueAccessToken({ id: user.id, username: user.username, roles: user.roles });
  return { accessToken, expiresIn: JWT_EXPIRES_IN };
}

module.exports = { login, issueAccessToken, verifyAccessToken, findUserByUsername, verifyPassword };
