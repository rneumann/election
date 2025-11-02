import { v4 as uuidv4 } from 'uuid';
import { Client } from 'ldapts';
import 'dotenv/config';
import { logger } from '../conf/logger/logger.js';

/**
 * Returns an object with the admin user's username and password.
 * The password is set to the value of the ADMIN_PASSWORD environment variable,
 * or a randomly generated UUID v4 if this variable is not set.
 * @returns {object} an object with the admin user's username and password
 */
const getAdminUser = () => ({
  username: 'admin',
  password: process.env.ADMIN_PASSWORD || uuidv4(),
});

/**
 * Returns an object with the committee user's username and password.
 * The password is set to the value of the COMMITTEE_PASSWORD environment variable,
 * or a randomly generated UUID v4 if this variable is not set.
 * @returns {object} an object with the committee user's username and password
 */
const getCommitteeUser = () => ({
  username: 'committee',
  password: process.env.COMMITTEE_PASSWORD || uuidv4(),
});

/**
 * Login functionality for users, admin and committee.
 * using LDAP for normal users.
 * @param {string} username the username to be validated
 * @param {string} password the password to be validated
 * @returns {Promise<object>} a user object with username and role or null
 */
export const login = async (username, password) => {
  const { AD_URL, AD_BASE_DN, AD_DOMAIN } = process.env;

  username = username.trim();
  password = password.trim();
  // Check for special admin user
  if (username === getAdminUser().username && password === getAdminUser().password) {
    logger.debug('Admin user authenticated successfully.');
    return { username: getAdminUser().username, role: 'admin' };
  }
  if (username === getCommitteeUser().username && password === getCommitteeUser().password) {
    logger.debug('Committee user authenticated successfully.');
    return { username: getCommitteeUser().username, role: 'committee' };
  }
  // Normal user via LDAP
  if (!AD_URL || !AD_BASE_DN || !AD_DOMAIN) {
    logger.error('LDAP configuration is missing. Cannot authenticate user.');
    return undefined;
  }

  const client = new Client({
    url: AD_URL,
    timeout: 5000,
    connectTimeout: 5000,
  });

  try {
    await client.bind(`cn=${username},cn=users,${AD_BASE_DN}`, password);
    logger.debug(`User ${username} authenticated successfully via LDAP.`);
    return { username, role: 'voter' };
  } catch (error) {
    logger.error(`Error authenticating user ${username} via LDAP: ${error.message}`);
    return undefined;
  } finally {
    await client.unbind();
  }
};
