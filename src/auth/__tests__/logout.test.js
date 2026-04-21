const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const { logout } = require('../logout.controller');
const tokenService = require('../token.service');

const TEST_SECRET = 'test-secret';
const USER_ID = 'user-42';

function makeApp(user = { id: USER_ID }) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.user = user; next(); });
  app.post('/auth/logout', logout);
  return app;
}

function createAccessToken(payload = { id: USER_ID }, expiresIn = '15m') {
  return jwt.sign(payload, TEST_SECRET, { expiresIn });
}

describe('POST /auth/logout', () => {
  beforeEach(() => {
    tokenService._tokenBlacklist.clear();
    tokenService._refreshTokenStore.clear();
  });

  test('200: successfully logs out with a valid Bearer token', async () => {
    const token = createAccessToken();
    await tokenService.storeRefreshToken(USER_ID, 'some-refresh-token');
    const res = await request(makeApp()).post('/auth/logout').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Successfully logged out.');
  });

  test('200: access token is blacklisted after logout', async () => {
    const token = createAccessToken();
    await request(makeApp()).post('/auth/logout').set('Authorization', `Bearer ${token}`);
    expect(tokenService.isTokenBlacklisted(token)).toBe(true);
  });

  test('200: refresh token is removed from the store after logout', async () => {
    const token = createAccessToken();
    await tokenService.storeRefreshToken(USER_ID, 'refresh-abc');
    await request(makeApp()).post('/auth/logout').set('Authorization', `Bearer ${token}`);
    const storedRefresh = await tokenService.getRefreshToken(USER_ID);
    expect(storedRefresh).toBeUndefined();
  });

  test('200: response instructs client to clear the refreshToken cookie', async () => {
    const token = createAccessToken();
    const res = await request(makeApp()).post('/auth/logout').set('Authorization', `Bearer ${token}`);
    const setCookieHeader = res.headers['set-cookie'];
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader.join(' ')).toMatch(/refreshToken/i);
  });

  test('401: returns 401 when Authorization header is missing', async () => {
    const res = await request(makeApp()).post('/auth/logout');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('No active session found.');
  });

  test('401: returns 401 when Authorization header is malformed', async () => {
    const res = await request(makeApp()).post('/auth/logout').set('Authorization', 'InvalidTokenFormat');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('No active session found.');
  });

  test('200: logout succeeds even when no refresh token was stored for the user', async () => {
    const token = createAccessToken();
    const res = await request(makeApp()).post('/auth/logout').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  test('200: logout succeeds when req.user is not set', async () => {
    const token = createAccessToken();
    const appNoUser = express();
    appNoUser.use(express.json());
    appNoUser.post('/auth/logout', logout);
    const res = await request(appNoUser).post('/auth/logout').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  describe('tokenService.isTokenBlacklisted', () => {
    test('returns false for a token that has not been invalidated', () => {
      expect(tokenService.isTokenBlacklisted(createAccessToken())).toBe(false);
    });
    test('returns true immediately after invalidation', async () => {
      const token = createAccessToken();
      await tokenService.invalidateToken(token);
      expect(tokenService.isTokenBlacklisted(token)).toBe(true);
    });
    test('prunes expired entries and returns false', async () => {
      const expiredToken = jwt.sign({ id: USER_ID }, TEST_SECRET, { expiresIn: 1 });
      await tokenService.invalidateToken(expiredToken);
      tokenService._tokenBlacklist.set(expiredToken, Date.now() - 1000);
      expect(tokenService.isTokenBlacklisted(expiredToken)).toBe(false);
    });
  });

  describe('tokenService refresh token helpers', () => {
    test('storeRefreshToken and getRefreshToken round-trip', async () => {
      await tokenService.storeRefreshToken('u1', 'rt-token-xyz');
      expect(await tokenService.getRefreshToken('u1')).toBe('rt-token-xyz');
    });
    test('clearRefreshToken removes the stored token', async () => {
      await tokenService.storeRefreshToken('u2', 'rt-token-abc');
      await tokenService.clearRefreshToken('u2');
      expect(await tokenService.getRefreshToken('u2')).toBeUndefined();
    });
  });
});
