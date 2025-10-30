import { v4 as uuidv4 } from 'uuid';
import { Client } from 'ldapts';
import dotenv from 'dotenv';
import { logger } from '../conf/logger/logger.js';
dotenv.config();

const { AD_URL, AD_BASE_DN, AD_DOMAIN } = process.env;

/**
 * Special admin user
 */
const adminUser = {
  username: 'admin',
  password: process.env.ADMIN_PASSWORD || uuidv4(),
};

/**
 * Special committee user
 */
const committeeUser = {
  username: 'committee',
  password: process.env.COMMITTEE_PASSWORD || uuidv4(),
};

/**
 * Login functionality for users, admin and committee.
 * using LDAP for normal users.
 * @param {string} username the username to be validated
 * @param {string} password the password to be validated
 * @returns {Promise<object>} a user object with username and role or null
 */
export const login = async (username, password) => {
  username = username.trim();
  password = password.trim();
  // Check for special admin user
  if (username === adminUser.username && password === adminUser.password) {
    logger.debug('Admin user authenticated successfully.');
    return { username: adminUser.username, role: 'admin' };
  }
  if (username === committeeUser.username && password === committeeUser.password) {
    logger.debug('Committee user authenticated successfully.');
    return { username: committeeUser.username, role: 'committee' };
  }
  // Normal user via LDAP
  if (!AD_URL || !AD_BASE_DN || !AD_DOMAIN) {
    logger.error('LDAP configuration is missing. Cannot authenticate user.');
    return null;
  }

  const client = new Client({
    url: AD_URL,
    timeout: 5000,
    connectTimeout: 5000,
  });

  try {
    await client.bind(`${AD_DOMAIN}\\${username}`, password);
    logger.debug(`User ${username} authenticated successfully via LDAP.`);
    return { username, role: 'voter' };
  } catch (error) {
    logger.error(`Error authenticating user ${username} via LDAP: ${error.message}`);
    return { isAuthenticated: false, message: 'Invalid credentials' };
  } finally {
    await client.unbind();
  }
};
