import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
describe('Session Fingerprint Protection', () => {
  let agent;

  beforeEach(() => {
    agent = request.agent(app);
  });

  it('sets user fingerprint on fresh user', async () => {
    const loginRes = await agent
      .post('/api/auth/login/ldap')
      .send({
        username: 'u001',
        password: 'p',
      })
      .set('User-Agent', 'BrowserABC')
      .set('X-Forwarded-For', '1.0.0.1');

    expect(loginRes.status).toBe(200);

    const res = await agent
      .get('/api/auth/me')
      .set('User-Agent', 'BrowserABC')
      .set('X-Forwarded-For', '1.0.0.1');

    expect(res.status).toBe(200);
  });

  it('throw error if fingerprint does not match because of different ip', async () => {
    const loginRes = await agent.post('/api/auth/login/ldap').send({
      username: 'u001',
      password: 'p',
    });

    expect(loginRes.status).toBe(200);

    const res = await agent
      .get('/api/auth/me')
      .set('User-Agent', 'BrowserABC')
      .set('X-Forwarded-For', '1.0.0.1');

    expect(res.status).toBe(200);

    const res2 = await agent
      .get('/api/auth/me')
      .set('User-Agent', 'BrowserABC')
      .set('X-Forwarded-For', '2.0.0.1');

    expect(res2.status).toBe(401);
  });

  it('throw error if fingerprint does not match because of different user agent', async () => {
    const loginRes = await agent.post('/api/auth/login/ldap').send({
      username: 'joe doe',
      password: 'p',
    });

    expect(loginRes.status).toBe(200);

    const res = await agent
      .get('/api/auth/me')
      .set('User-Agent', 'BrowserABC')
      .set('X-Forwarded-For', '1.0.0.1');

    expect(res.status).toBe(200);

    const res2 = await agent
      .get('/api/auth/me')
      .set('User-Agent', 'BrowserXYZ')
      .set('X-Forwarded-For', '1.0.0.1');

    expect(res2.status).toBe(401);
  });
});
