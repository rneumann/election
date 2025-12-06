import { describe, test, expect, vi, beforeEach } from 'vitest';

process.env.ADMIN_PASSWORD = 'admin123';
process.env.COMMITTEE_PASSWORD = 'committee123';
process.env.AD_URL = 'ldap://mockserver';
process.env.AD_BASE_DN = 'dc=example,dc=com';
process.env.AD_DOMAIN = 'EXAMPLE';
process.env.ADMIN_DN = 'cn=admin,dc=ads,dc=hs-karlsruhe,dc=de';
process.env.ADMIN_PASSWORD_LDAP = 'p';

const ADMIN_DN = process.env.ADMIN_DN;
const ADMIN_PASSWORD_LDAP = process.env.ADMIN_PASSWORD_LDAP;
const USER_DN = `uid=user1,ou=students,${process.env.AD_BASE_DN}`;
vi.mock('../src/conf/logger/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import { ensureHasRole } from '../src/auth/auth.js';
import { logger } from '../src/conf/logger/logger.js';
import { login } from '../src/auth/strategies/ldap.strategy.js';

const bindMock = vi.fn(async (dn, pw) => {
  if (dn === USER_DN && pw === 'pass1') {
    return;
  }
  if (dn.startsWith('cn=user1') && pw === 'wrongpass') {
    throw new Error('Invalid credentials');
  }

  if (dn.startsWith('cn=user1') && pw !== 'pass1') {
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
    expect(bindMock).toHaveBeenCalledWith(
      `uid=${username},ou=students,${process.env.AD_BASE_DN}`,
      password,
    );
    expect(logger.error).toHaveBeenCalledWith(
      `Error authenticating user user1 via LDAP: Unexpected bind call with DN: uid=${username},ou=students,dc=example,dc=com`,
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

    expect(bindMock).toHaveBeenCalledWith(
      `uid=user1,ou=students,${process.env.AD_BASE_DN}`,
      'pass1',
    );

    expect(bindMock).toHaveBeenCalledTimes(1);

    expect(logger.info).toHaveBeenCalledWith(
      `User ${USER_DN} authenticated successfully via LDAP.`,
    );
  });

  test('should call next middleware', async () => {
    const next = vi.fn();
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const req = {
      user: {
        role: 'admin',
      },
    };

    ensureHasRole(['admin'])(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('should call unauthorized if user is not authenticated', async () => {
    const next = vi.fn();
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const req = {};

    ensureHasRole(['admin'])(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('should call forbidden if user is not authorized', async () => {
    const next = vi.fn();
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const req = {
      user: {
        role: 'committee',
      },
    };
    ensureHasRole(['admin'])(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
