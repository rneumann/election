import { Strategy } from 'passport-local';
import { Client } from 'ldapts';
import { checkAdminOrCommittee } from '../auth.js';
import { logger } from '../../conf/logger/logger.js';

const { ADMIN_PASSWORD_LDAP, ADMIN_DN } = process.env;

export const ldapStrategy = new Strategy(async (username, password, done) => {
  const user = await login(username, password);
  if (!user) {
    return done(null, false);
  }
  return done(null, user);
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

  // Check for special admin or committee user
  const adminOrCommittee = await checkAdminOrCommittee(username, password);
  if (adminOrCommittee) {
    return adminOrCommittee;
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

    const userDN = await searchUser(client, username, AD_BASE_DN);
    logger.debug(`Attempting final user bind with DN: ${userDN}`);
    await client.bind(userDN, password);
    logger.debug(`User ${userDN} authenticated successfully via LDAP.`);
    return { username, role: 'voter', authProvider: 'ldap' };
  } catch (error) {
    logger.error(`Error authenticating user ${username} via LDAP: ${error.message}`);
    return undefined;
  } finally {
    await client.unbind();
  }
};

/**
 * Searches for a user in LDAP based on the login name
 * @param {Client} client - The LDAP client
 * @param {string} loginName - The login name to search for
 * @param {string} baseDN - The base DN to search in
 * @returns {Promise<string>} The distinguished name of the user
 * @throws {Error} If the user is not found in LDAP
 */
const searchUser = async (client, loginName, baseDN) => {
  try {
    const searchBaseDN = `ou=people,${baseDN}`;
    logger.debug(`Searching for user with login name ${loginName} in LDAP...`);
    await client.bind(ADMIN_DN, ADMIN_PASSWORD_LDAP);
    logger.debug(`User ${ADMIN_DN} authenticated successfully via LDAP.`);
    const searchResults = await client.search(searchBaseDN, {
      filter: `(uid=${loginName})`,
      scope: 'sub',
      attributes: ['dn'],
    });
    logger.debug(
      `Found ${JSON.stringify(searchResults)} users in LDAP for login name ${loginName}`,
    );
    if (searchResults.searchEntries.length === 0) {
      throw new Error('User not found in LDAP search.');
    }
    const userDN = searchResults.searchEntries[0].dn;
    await client.unbind();
    return userDN;
  } catch (error) {
    logger.error(`Error searching for user with login name ${loginName} in LDAP: ${error.message}`);
    throw error;
  }
};
