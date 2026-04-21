const jwt = require('jsonwebtoken');
const { login, issueAccessToken, verifyAccessToken, findUserByUsername, verifyPassword } = require('../authService');

process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_ISSUER = 'myapp';
process.env.JWT_AUDIENCE = 'myapp-client';

describe('authService', () => {
  describe('findUserByUsername', () => {
    it('returns the user object when the username exists', () => {
      const user = findUserByUsername('alice');
      expect(user).toBeDefined();
      expect(user.username).toBe('alice');
      expect(user.id).toBe('1');
    });
    it('returns null for an unknown username', () => {
      expect(findUserByUsername('ghost')).toBeNull();
    });
  });

  describe('verifyPassword', () => {
    const crypto = require('crypto');
    const hash = (p) => crypto.createHash('sha256').update(p).digest('hex');
    it('returns true when the password matches', () => {
      expect(verifyPassword('password123', hash('password123'))).toBe(true);
    });
    it('returns false when the password does not match', () => {
      expect(verifyPassword('wrong', hash('password123'))).toBe(false);
    });
  });

  describe('issueAccessToken', () => {
    const userPayload = { id: '42', username: 'testuser', roles: ['user'] };
    it('returns a 3-part JWT string', () => {
      const token = issueAccessToken(userPayload);
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });
    it('encodes correct sub, username and roles', () => {
      const decoded = jwt.decode(issueAccessToken(userPayload));
      expect(decoded.sub).toBe('42');
      expect(decoded.username).toBe('testuser');
      expect(decoded.roles).toEqual(['user']);
    });
    it('sets issuer and audience claims', () => {
      const decoded = jwt.decode(issueAccessToken(userPayload));
      expect(decoded.iss).toBe('myapp');
      expect(decoded.aud).toBe('myapp-client');
    });
    it('includes a short-lived exp claim (~15m)', () => {
      const before = Math.floor(Date.now() / 1000);
      const decoded = jwt.decode(issueAccessToken(userPayload));
      const after = Math.floor(Date.now() / 1000);
      expect(decoded.exp).toBeGreaterThanOrEqual(before + 14 * 60);
      expect(decoded.exp).toBeLessThanOrEqual(after + 15 * 60 + 5);
    });
  });

  describe('verifyAccessToken', () => {
    it('verifies a freshly issued token', () => {
      const token = issueAccessToken({ id: '1', username: 'alice', roles: ['user'] });
      const decoded = verifyAccessToken(token);
      expect(decoded.sub).toBe('1');
      expect(decoded.username).toBe('alice');
    });
    it('throws on a tampered token', () => {
      const token = issueAccessToken({ id: '1', username: 'alice', roles: ['user'] });
      expect(() => verifyAccessToken(token.slice(0, -5) + 'XXXXX')).toThrow();
    });
    it('throws on a completely invalid token', () => {
      expect(() => verifyAccessToken('not.a.token')).toThrow();
    });
    it('throws TokenExpiredError for an expired token', () => {
      const expired = jwt.sign({ sub: '1', username: 'alice', roles: ['user'] }, 'test-secret-key', { expiresIn: -1, issuer: 'myapp', audience: 'myapp-client' });
      expect(() => verifyAccessToken(expired)).toThrow(jwt.TokenExpiredError);
    });
  });

  describe('login', () => {
    it('returns accessToken and expiresIn on valid credentials', () => {
      const result = login('alice', 'password123');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('expiresIn', '15m');
    });
    it('returned token contains correct claims', () => {
      const { accessToken } = login('admin', 'adminpass');
      const decoded = verifyAccessToken(accessToken);
      expect(decoded.username).toBe('admin');
      expect(decoded.roles).toContain('admin');
    });
    it('throws when username is missing', () => {
      expect(() => login('', 'password123')).toThrow('Username and password are required.');
    });
    it('throws when password is missing', () => {
      expect(() => login('alice', '')).toThrow('Username and password are required.');
    });
    it('throws for an unknown username', () => {
      expect(() => login('nobody', 'password123')).toThrow('Invalid credentials.');
    });
    it('throws for a wrong password', () => {
      expect(() => login('alice', 'wrongpassword')).toThrow('Invalid credentials.');
    });
    it('uses the same error message for unknown user and wrong password (no leakage)', () => {
      let e1, e2;
      try { login('nobody', 'irrelevant'); } catch (e) { e1 = e.message; }
      try { login('alice', 'wrongpassword'); } catch (e) { e2 = e.message; }
      expect(e1).toBe(e2);
    });
  });
});
