const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// ---- Mock the user repository ----
jest.mock('../userRepository');
const { findUserByEmail } = require('../userRepository');

const { login } = require('../authController');

// Helper – build lightweight req/res mocks
function buildReqRes(body = {}) {
  const req = { body };
  const res = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
  };
  return { req, res };
}

describe('AuthController – login', () => {
  const RAW_PASSWORD = 'P@ssw0rd!';
  let passwordHash;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(RAW_PASSWORD, 10);
  });

  afterEach(() => jest.clearAllMocks());

  describe('Input validation', () => {
    test('returns 400 when email is missing', async () => {
      const { req, res } = buildReqRes({ password: RAW_PASSWORD });
      await login(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/email and password are required/i);
    });

    test('returns 400 when password is missing', async () => {
      const { req, res } = buildReqRes({ email: 'user@example.com' });
      await login(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/email and password are required/i);
    });

    test('returns 400 when email format is invalid', async () => {
      const { req, res } = buildReqRes({ email: 'not-an-email', password: RAW_PASSWORD });
      await login(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/invalid email format/i);
    });
  });

  describe('Authentication logic', () => {
    test('returns 401 when user is not found', async () => {
      findUserByEmail.mockResolvedValue(null);
      const { req, res } = buildReqRes({ email: 'ghost@example.com', password: RAW_PASSWORD });
      await login(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    test('returns 401 when password does not match', async () => {
      findUserByEmail.mockResolvedValue({ id: '1', email: 'user@example.com', passwordHash, role: 'user' });
      const { req, res } = buildReqRes({ email: 'user@example.com', password: 'WrongPass!' });
      await login(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    test('returns 200 with token on successful login', async () => {
      findUserByEmail.mockResolvedValue({ id: '42', email: 'user@example.com', passwordHash, role: 'admin' });
      const { req, res } = buildReqRes({ email: 'user@example.com', password: RAW_PASSWORD });
      await login(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toMatchObject({ id: '42', email: 'user@example.com', role: 'admin' });
    });

    test('JWT payload contains correct claims on success', async () => {
      findUserByEmail.mockResolvedValue({ id: '42', email: 'user@example.com', passwordHash, role: 'admin' });
      const { req, res } = buildReqRes({ email: 'user@example.com', password: RAW_PASSWORD });
      await login(req, res);
      const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET || 'your-secret-key');
      expect(decoded.sub).toBe('42');
      expect(decoded.email).toBe('user@example.com');
      expect(decoded.role).toBe('admin');
    });

    test('email lookup is case-insensitive', async () => {
      findUserByEmail.mockResolvedValue({ id: '7', email: 'user@example.com', passwordHash, role: 'user' });
      const { req, res } = buildReqRes({ email: '  User@Example.COM  ', password: RAW_PASSWORD });
      await login(req, res);
      expect(findUserByEmail).toHaveBeenCalledWith('user@example.com');
      expect(res.statusCode).toBe(200);
    });
  });

  describe('Error handling', () => {
    test('returns 500 when repository throws an unexpected error', async () => {
      findUserByEmail.mockRejectedValue(new Error('DB connection lost'));
      const { req, res } = buildReqRes({ email: 'user@example.com', password: RAW_PASSWORD });
      await login(req, res);
      expect(res.statusCode).toBe(500);
      expect(res.body.message).toMatch(/internal server error/i);
    });
  });
});
