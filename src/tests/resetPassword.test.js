const request = require('supertest');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

jest.mock('../models/userModel', () => ({
  findUserByResetToken: jest.fn(),
  updateUserPassword: jest.fn(),
  invalidateResetToken: jest.fn(),
}));

const {
  findUserByResetToken,
  updateUserPassword,
  invalidateResetToken,
} = require('../models/userModel');

const { validatePassword } = require('../controllers/resetPasswordController');
const authRoutes = require('../routes/authRoutes');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

const SECRET = 'test-reset-secret';
process.env.RESET_TOKEN_SECRET = SECRET;

function makeToken(payload = { userId: 1 }, expiresIn = '1h') {
  return jwt.sign(payload, SECRET, { expiresIn });
}

const VALID_PASSWORD = 'Secure@123';

describe('validatePassword()', () => {
  test('returns null for a valid password', () => {
    expect(validatePassword('Secure@123')).toBeNull();
  });
  test('rejects password shorter than 8 characters', () => {
    expect(validatePassword('Ab1!')).toMatch(/at least 8 characters/);
  });
  test('rejects password without uppercase letter', () => {
    expect(validatePassword('secure@123')).toMatch(/uppercase/);
  });
  test('rejects password without lowercase letter', () => {
    expect(validatePassword('SECURE@123')).toMatch(/lowercase/);
  });
  test('rejects password without digit', () => {
    expect(validatePassword('Secure@abc')).toMatch(/digit/);
  });
  test('rejects password without special character', () => {
    expect(validatePassword('Secure1234')).toMatch(/special character/);
  });
  test('rejects null/undefined password', () => {
    expect(validatePassword(null)).toMatch(/at least 8 characters/);
    expect(validatePassword(undefined)).toMatch(/at least 8 characters/);
  });
});

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('returns 400 when token is missing', async () => {
    const res = await request(app).post('/api/auth/reset-password')
      .send({ password: VALID_PASSWORD, confirmPassword: VALID_PASSWORD });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/required/);
  });
  test('returns 400 when password is missing', async () => {
    const res = await request(app).post('/api/auth/reset-password')
      .send({ token: makeToken(), confirmPassword: VALID_PASSWORD });
    expect(res.status).toBe(400);
  });
  test('returns 400 when confirmPassword is missing', async () => {
    const res = await request(app).post('/api/auth/reset-password')
      .send({ token: makeToken(), password: VALID_PASSWORD });
    expect(res.status).toBe(400);
  });
  test('returns 400 when passwords do not match', async () => {
    const res = await request(app).post('/api/auth/reset-password')
      .send({ token: makeToken(), password: VALID_PASSWORD, confirmPassword: 'Different@99' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/do not match/);
  });
  test('returns 400 for a weak password', async () => {
    const res = await request(app).post('/api/auth/reset-password')
      .send({ token: makeToken(), password: 'weakpass', confirmPassword: 'weakpass' });
    expect(res.status).toBe(400);
  });
  test('returns 400 for an expired JWT token', async () => {
    const expiredToken = makeToken({ userId: 1 }, '-1s');
    const res = await request(app).post('/api/auth/reset-password')
      .send({ token: expiredToken, password: VALID_PASSWORD, confirmPassword: VALID_PASSWORD });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid or has expired/);
  });
  test('returns 400 for a malformed token', async () => {
    const res = await request(app).post('/api/auth/reset-password')
      .send({ token: 'not.a.valid.token', password: VALID_PASSWORD, confirmPassword: VALID_PASSWORD });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid or has expired/);
  });
  test('returns 400 when token is not found in the database', async () => {
    findUserByResetToken.mockResolvedValue(null);
    const res = await request(app).post('/api/auth/reset-password')
      .send({ token: makeToken(), password: VALID_PASSWORD, confirmPassword: VALID_PASSWORD });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already been used/);
  });
  test('returns 200 and resets password successfully', async () => {
    findUserByResetToken.mockResolvedValue({ id: 42, email: 'user@example.com' });
    updateUserPassword.mockResolvedValue(true);
    invalidateResetToken.mockResolvedValue(true);
    const res = await request(app).post('/api/auth/reset-password')
      .send({ token: makeToken(), password: VALID_PASSWORD, confirmPassword: VALID_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/successfully/);
    expect(updateUserPassword).toHaveBeenCalledWith(42, expect.any(String));
    expect(invalidateResetToken).toHaveBeenCalledWith(42);
  });
  test('stores a bcrypt hash (not plaintext) in the database', async () => {
    findUserByResetToken.mockResolvedValue({ id: 42, email: 'user@example.com' });
    updateUserPassword.mockResolvedValue(true);
    invalidateResetToken.mockResolvedValue(true);
    await request(app).post('/api/auth/reset-password')
      .send({ token: makeToken(), password: VALID_PASSWORD, confirmPassword: VALID_PASSWORD });
    const storedHash = updateUserPassword.mock.calls[0][1];
    expect(storedHash).not.toBe(VALID_PASSWORD);
    expect(await bcrypt.compare(VALID_PASSWORD, storedHash)).toBe(true);
  });
  test('returns 500 when an unexpected error occurs', async () => {
    findUserByResetToken.mockRejectedValue(new Error('DB connection lost'));
    const res = await request(app).post('/api/auth/reset-password')
      .send({ token: makeToken(), password: VALID_PASSWORD, confirmPassword: VALID_PASSWORD });
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
