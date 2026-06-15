import { describe, test, expect, vi, beforeEach } from 'vitest';

const { ldapMocks, loggerMock, candidateMock } = vi.hoisted(() => {
  return {
    ldapMocks: {
      bind: vi.fn(),
      unbind: vi.fn(),
    },
    loggerMock: {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    },
    candidateMock: {
      checkIfVoterIsCandidate: vi.fn().mockResolvedValue(false),
    },
  };
});

vi.mock('../src/conf/logger/logger.js', () => ({ logger: loggerMock }));
vi.mock('../src/service/candidate.service.js', () => ({
  checkIfVoterIsCandidate: candidateMock.checkIfVoterIsCandidate,
}));

vi.mock('ldapts', () => ({
  Client: class {
    bind = ldapMocks.bind;
    unbind = ldapMocks.unbind;
  },
}));

import { ensureHasRole } from '../src/auth/auth.js';
import { login } from '../src/auth/strategies/ldap.strategy.js';

const EXPECTED_USER_DN = 'uid=user1,ou=students,dc=example,dc=com';

describe('login', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    ldapMocks.bind.mockImplementation(async (dn, pw) => {
      if (dn === EXPECTED_USER_DN && pw === 'pass1') return;
      if (dn === EXPECTED_USER_DN && pw === 'wrongpass') {
        throw new Error('Invalid credentials');
      }
      throw new Error(`Unexpected bind: ${dn}`);
    });
  });

  test('should return admin user', async () => {
    const result = await login('admin', 'admin123');
    expect(result).toEqual({ username: 'admin', role: 'admin' });
  });

  test('should return undefined for invalid credentials', async () => {
    const result = await login('user1', 'wrongpass');
    expect(result).toBeUndefined();
    expect(ldapMocks.bind).toHaveBeenCalledWith(EXPECTED_USER_DN, 'wrongpass');
  });

  test('should return LDAP-user with correct credentials', async () => {
    const result = await login('user1', 'pass1');
    expect(result).toEqual({
      username: 'user1',
      role: 'voter',
      authProvider: 'ldap',
      isCandidate: false,
    });
    expect(ldapMocks.bind).toHaveBeenCalledWith(EXPECTED_USER_DN, 'pass1');
    expect(ldapMocks.unbind).toHaveBeenCalled();
  });

  test('should return committee user', async () => {
    const result = await login('committee', 'committee123');
    expect(result).toEqual({ username: 'committee', role: 'committee' });
    expect(loggerMock.debug).toHaveBeenCalledWith('Committee user authenticated successfully.');
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
