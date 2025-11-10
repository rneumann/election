// __tests__/auth.test.js
import { describe, test, expect, vi, beforeEach } from 'vitest';

// Environment Variablen für Tests setzen
process.env.ADMIN_PASSWORD = 'admin123';
process.env.COMMITTEE_PASSWORD = 'committee123';
process.env.AD_URL = 'ldap://mockserver';
process.env.AD_BASE_DN = 'dc=example,dc=com';
process.env.AD_DOMAIN = 'EXAMPLE';

// Mock für Logger
vi.mock('../src/conf/logger/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

import { ensureHasRole, login } from '../src/auth/auth.js';
import { logger } from '../src/conf/logger/logger.js';

// Mock für LDAP Client
const bindMock = vi.fn(async (dn, pw) => {
  if (dn === 'cn=user1,cn=users,dc=example,dc=com' && pw === 'pass1') return;
  throw new Error('Invalid credentials');
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
    expect(bindMock).toHaveBeenCalledWith('cn=user1,cn=users,dc=example,dc=com', 'wrongpass');
    expect(unbindMock).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      `Error authenticating user ${username} via LDAP: Invalid credentials`,
    );
  });

  test('should return LDAP-user with correct credentials', async () => {
    const result = await login('user1', 'pass1');
    expect(result).toEqual({ username: 'user1', role: 'voter' });
    expect(bindMock).toHaveBeenCalledWith('cn=user1,cn=users,dc=example,dc=com', 'pass1');
    expect(unbindMock).toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith('User user1 authenticated successfully via LDAP.');
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
