/**
 * Unit / integration tests for the rate-limiter middleware (KAN-78).
 */
'use strict';

const express = require('express');
const request = require('supertest');
const { buildLimiter } = require('../rateLimiter');

function makeApp(limiter) {
  const app = express();
  app.use(express.json());
  app.set('trust proxy', 1);
  app.post('/test', limiter, (_req, res) => res.status(200).json({ ok: true }));
  return app;
}

async function sendRequests(app, count, path = '/test') {
  const responses = [];
  for (let i = 0; i < count; i++) {
    const res = await request(app).post(path).set('X-Forwarded-For', '192.0.2.1');
    responses.push(res);
  }
  return responses;
}

describe('buildLimiter - generic behaviour', () => {
  const WINDOW_MS = 60_000;
  const MAX = 3;
  let app;

  beforeEach(() => {
    const limiter = buildLimiter({ windowMs: WINDOW_MS, max: MAX, keyPrefix: 'rl:test:', message: 'Slow down!' });
    app = makeApp(limiter);
  });

  test('allows requests up to the configured limit', async () => {
    const responses = await sendRequests(app, MAX);
    responses.forEach((res) => expect(res.status).toBe(200));
  });

  test('blocks the (max + 1)th request with HTTP 429', async () => {
    await sendRequests(app, MAX);
    const blocked = await request(app).post('/test').set('X-Forwarded-For', '192.0.2.1');
    expect(blocked.status).toBe(429);
  });

  test('429 response body contains expected fields', async () => {
    await sendRequests(app, MAX);
    const blocked = await request(app).post('/test').set('X-Forwarded-For', '192.0.2.1');
    expect(blocked.body).toMatchObject({ error: 'Too Many Requests', message: 'Slow down!', retryAfter: Math.ceil(WINDOW_MS / 1000) });
  });

  test('sets RateLimit-Limit header on allowed requests', async () => {
    const [firstRes] = await sendRequests(app, 1);
    expect(firstRes.headers).toHaveProperty('ratelimit-limit');
    expect(Number(firstRes.headers['ratelimit-limit'])).toBe(MAX);
  });

  test('sets RateLimit-Remaining header and it decrements', async () => {
    const [first, second] = await sendRequests(app, 2);
    expect(Number(second.headers['ratelimit-remaining'])).toBe(Number(first.headers['ratelimit-remaining']) - 1);
  });

  test('different IPs have independent counters', async () => {
    for (let i = 0; i < MAX; i++) {
      await request(app).post('/test').set('X-Forwarded-For', '10.0.0.1');
    }
    const ipBResponse = await request(app).post('/test').set('X-Forwarded-For', '10.0.0.2');
    expect(ipBResponse.status).toBe(200);
  });
});

describe('buildLimiter - skipSuccessfulRequests = true', () => {
  let app;
  const MAX = 3;

  beforeEach(() => {
    const limiter = buildLimiter({ windowMs: 60_000, max: MAX, keyPrefix: 'rl:skip-success:', message: 'Too many failures.', skipSuccessfulRequests: true });
    const localApp = express();
    localApp.use(express.json());
    localApp.set('trust proxy', 1);
    localApp.post('/success', limiter, (_req, res) => res.status(200).json({ ok: true }));
    localApp.post('/fail', limiter, (_req, res) => res.status(401).json({ ok: false }));
    app = localApp;
  });

  test('successful responses do not consume quota', async () => {
    for (let i = 0; i < MAX + 2; i++) {
      const res = await request(app).post('/success').set('X-Forwarded-For', '192.0.2.5');
      expect(res.status).toBe(200);
    }
  });

  test('failed responses DO consume quota and eventually trigger 429', async () => {
    for (let i = 0; i < MAX; i++) {
      await request(app).post('/fail').set('X-Forwarded-For', '192.0.2.6');
    }
    const blocked = await request(app).post('/fail').set('X-Forwarded-For', '192.0.2.6');
    expect(blocked.status).toBe(429);
  });
});

describe('loginRateLimiter - policy via auth route', () => {
  const authRouter = require('../../routes/auth');
  const appWithAuth = express();
  appWithAuth.use(express.json());
  appWithAuth.set('trust proxy', 1);
  appWithAuth.use('/auth', authRouter);

  test('login returns 200 for valid credentials', async () => {
    const res = await request(appWithAuth).post('/auth/login').set('X-Forwarded-For', '203.0.113.10').send({ email: 'user@example.com', password: 'correctpassword' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  test('login returns 401 for invalid credentials', async () => {
    const res = await request(appWithAuth).post('/auth/login').set('X-Forwarded-For', '203.0.113.11').send({ email: 'user@example.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  test('login returns 400 when body fields are missing', async () => {
    const res = await request(appWithAuth).post('/auth/login').set('X-Forwarded-For', '203.0.113.12').send({});
    expect(res.status).toBe(400);
  });
});

describe('passwordResetRateLimiter - policy via auth route', () => {
  const authRouter = require('../../routes/auth');
  const appWithAuth = express();
  appWithAuth.use(express.json());
  appWithAuth.set('trust proxy', 1);
  appWithAuth.use('/auth', authRouter);

  test('password-reset returns 200 even for unknown email (anti-enumeration)', async () => {
    const res = await request(appWithAuth).post('/auth/password-reset').set('X-Forwarded-For', '203.0.113.20').send({ email: 'unknown@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/password reset link/i);
  });

  test('password-reset returns 400 when email is missing', async () => {
    const res = await request(appWithAuth).post('/auth/password-reset').set('X-Forwarded-For', '203.0.113.21').send({});
    expect(res.status).toBe(400);
  });
});
