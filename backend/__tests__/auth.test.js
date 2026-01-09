import { describe, test, expect, vi, beforeEach } from 'vitest';

process.env.ADMIN_PASSWORD = 'admin123';
process.env.COMMITTEE_PASSWORD = 'committee123';
process.env.AD_URL = 'ldap://mockserver';
process.env.AD_USER_BIND_DN = 'uid=${username},ou=students,dc=example,dc=com';
process.env.AD_DOMAIN = 'EXAMPLE';

const EXPECTED_USER_DN = 'uid=user1,ou=students,dc=example,dc=com';

vi.mock('../src/conf/logger/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../src/service/candidate.service.js', () => ({
  checkIfVoterIsCandidate: vi.fn().mockResolvedValue(false),
}));

// Mocks müssen vor den Imports definiert sein
const bindMock = vi.fn(async (dn, pw) => {
  // Prüfung gegen den fertig aufgelösten DN
  if (dn === EXPECTED_USER_DN && pw === 'pass1') {
    return;
  }

  if (dn === EXPECTED_USER_DN && pw === 'wrongpass') {
    throw new Error('Invalid credentials');
  }

  throw new Error(`Unexpected bind call with DN: ${dn}`);
});

const unbindMock = vi.fn(async () => {});

vi.mock('ldapts', () => ({
  Client: class {
    bind = bindMock;
    unbind = unbindMock;
  },
}));

import { ensureHasRole } from '../src/auth/auth.js';
import { logger } from '../src/conf/logger/logger.js';
import { login } from '../src/auth/strategies/ldap.strategy.js';

describe('login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should return admin user', async () => {
    const result = await login('admin', 'admin123');
    expect(result).toEqual({ username: 'admin', role: 'admin' });
    expect(logger.debug).toHaveBeenCalledWith('Admin user authenticated successfully.');
  });

  test('should return committee user', async () => {
    const result = await login('committee', 'committee123');
    expect(result).toEqual({ username: 'committee', role: 'committee' });
    expect(logger.debug).toHaveBeenCalledWith('Committee user authenticated successfully.');
  });

  test('should return undefined for invalid credentials', async () => {
    const username = 'user1';
    const password = 'wrongpass';
    const result = await login(username, password);

    expect(result).toBeUndefined();
    // Der Bind-Aufruf muss den ersetzten Usernamen enthalten
    expect(bindMock).toHaveBeenCalledWith(EXPECTED_USER_DN, password);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error authenticating user user1 via LDAP: Invalid credentials'),
    );
  });

  test('should return LDAP-user with correct credentials', async () => {
    const result = await login('user1', 'pass1');
    expect(result).toEqual({
      username: 'user1',
      role: 'voter',
      authProvider: 'ldap',
      isCandidate: false,
    });

    expect(bindMock).toHaveBeenCalledWith(EXPECTED_USER_DN, 'pass1');
    expect(bindMock).toHaveBeenCalledTimes(1);
    expect(unbindMock).toHaveBeenCalledTimes(1);
  });

  test('should call next middleware if role matches', async () => {
    const next = vi.fn();
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const req = {
      user: { role: 'admin' },
    };

    ensureHasRole(['admin'])(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('should return 401 if user is not authenticated in request', async () => {
    const next = vi.fn();
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const req = {};

    ensureHasRole(['admin'])(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('should return 403 if user has wrong role', async () => {
    const next = vi.fn();
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const req = {
      user: { role: 'committee', username: 'commUser' },
    };

    ensureHasRole(['admin'])(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
