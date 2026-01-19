import crypto from 'crypto';
import { readSecret } from '../security/secret-reader.js';
import { logger } from '../conf/logger/logger.js';

/**
 * Returns an object with the admin user's username and password.
 * The password is set to the value of the TEST_ADMIN_PASSWORD environment variable,
 * or a randomly generated UUID v4 if this variable is not set.
 * @returns {Promise<object>} an object with the admin user's username and password
 */
const getAdminUser = async () => {
  let password;
  try {
    password = await readSecret('TEST_ADMIN_PASSWORD');
  } catch (e) {
    // Falls TEST_ADMIN_PASSWORD nicht gesetzt ist, versuchen wir ADMIN_PASSWORD (für Produktion)
    try {
      password = await readSecret('ADMIN_PASSWORD');
    } catch (e2) {
      logger.warn(
        'Weder TEST_ADMIN_PASSWORD noch ADMIN_PASSWORD gefunden, nutze zufälliges Passwort',
      );
      password = crypto.randomUUID();
    }
  }
  return {
    username: 'admin',
    password,
  };
};

/**
 * Returns an object with the committee user's username and password.
 * The password is set to the value of the COMMITTEE_PASSWORD environment variable,
 * or a randomly generated UUID v4 if this variable is not set.
 * @returns {Promise<object>} an object with the committee user's username and password
 */
const getCommitteeUser = async () => {
  let password;
  try {
    password = await readSecret('COMMITTEE_PASSWORD');
  } catch (e) {
    logger.warn('COMMITTEE_PASSWORD nicht gefunden, nutze zufälliges Passwort');
    password = crypto.randomUUID();
  }
  return {
    username: 'committee',
    password,
  };
};

/**
 * Checks if the given username and password match the special admin or committee user.
 * The special users are retrieved from the getAdminUser and getCommitteeUser functions.
 * If a match is found, returns an object with the username and role (admin or committee).
 * @param {string} username - The username to check
 * @param {string} password - The password to check
 * @returns {Promise<object>} An object with the username and role, or null if no match is found
 */
export const checkAdminOrCommittee = async (username, password) => {
  const adminUser = await getAdminUser();
  const committeeUser = await getCommitteeUser();

  username = username.trim();
  // Check for special admin user
  if (username === adminUser.username && password === adminUser.password) {
    logger.debug('Admin user authenticated successfully.');
    return { username: adminUser.username, role: 'admin' };
  }
  if (username === committeeUser.username && password === committeeUser.password) {
    logger.debug('Committee user authenticated successfully.');
    return { username: committeeUser.username, role: 'committee' };
  }
  return null;
};
