import { promises as fs, constants } from 'fs';
import { Client } from 'ldapts';
import 'dotenv/config';
import { logger } from '../conf/logger/logger.js';

/**
 * Reads a secret from a file at /run/secrets/${name}.
 * If the file does not exist, it falls back to the environment variable
 * with the same name. If this variable is also not set, it returns the
 * optional fallback value. If no fallback is provided, it throws an
 * error.
 *
 * @param {string} name Name of the secret to read.
 * is not found.
 * @returns {Promise<string>} The secret value.
 * @throws {Error} If the secret is not found and no fallback is provided.
 */
const readSecret = async (name) => {
  const path = `/run/secrets/${name}`;
  try {
    // Prüft, ob Datei existiert
    await fs.access(path, constants.F_OK);
    const data = await fs.readFile(path, 'utf8');
    return data.trim();
  } catch {
    // eslint-disable-next-line
    const envValue = process.env[name];
    if (envValue) {
      return envValue;
    }
    throw new Error(`Secret for ${name} not found`);
  }
};

/**
 * Returns an object with the admin user's username and password.
 * The password is set to the value of the ADMIN_PASSWORD environment variable,
 * or a randomly generated UUID v4 if this variable is not set.
 * @returns {Promise<object>} an object with the admin user's username and password
 */
const getAdminUser = async () => ({
  username: 'admin',
  password: await readSecret('ADMIN_PASSWORD'),
});

/**
 * Returns an object with the committee user's username and password.
 * The password is set to the value of the COMMITTEE_PASSWORD environment variable,
 * or a randomly generated UUID v4 if this variable is not set.
 * @returns {Promise<object>} an object with the committee user's username and password
 */
const getCommitteeUser = async () => ({
  username: 'committee',
  password: await readSecret('COMMITTEE_PASSWORD'),
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
    logger.debug(`Authenticating user via LDAP with: cn=${username},cn=users,${AD_BASE_DN}`);
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
