import crypto from 'crypto';
import { readSecret } from '../security/secret-reader.js';
import { logger } from '../conf/logger/logger.js';

const getCredentialsOrFallback = async (username, primarySecret, fallbackSecret = null) => {
  let password;
  try {
    password = await readSecret(primarySecret);
  } catch (e) {
    if (fallbackSecret) {
      try {
        password = await readSecret(fallbackSecret);
      } catch (e2) {
        // Fallthrough to random
      }
    }

    if (!password) {
      logger.warn(
        `${primarySecret} ${fallbackSecret ? `und ${fallbackSecret} ` : ''}nicht gefunden, nutze zufälliges Passwort für ${username}`,
      );
      password = crypto.randomUUID();
    }
  }

  return { username, password };
};

/**
 * Returns an object with the admin user's username and password.
 * The password is set to the value of the TEST_ADMIN_PASSWORD environment variable,
 * or a randomly generated UUID v4 if this variable is not set.
 * @returns {Promise<object>} an object with the admin user's username and password
 */
const getAdminUser = async () => {
  return getCredentialsOrFallback('admin', 'TEST_ADMIN_PASSWORD', 'ADMIN_PASSWORD');
};

/**
 * Returns an object with the committee user's username and password.
 * The password is set to the value of the COMMITTEE_PASSWORD environment variable,
 * or a randomly generated UUID v4 if this variable is not set.
 * @returns {Promise<object>} an object with the committee user's username and password
 */
const getCommitteeUser = async () => {
  return getCredentialsOrFallback('committee', 'COMMITTEE_PASSWORD');
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
