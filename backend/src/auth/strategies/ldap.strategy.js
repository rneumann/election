import { Strategy } from 'passport-local';
import { Client } from 'ldapts';
import { checkAdminOrCommittee } from '../auth.js';
import { logger } from '../../conf/logger/logger.js';
import { checkIfVoterIsCandidate } from '../../service/candidate.service.js';

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

    logger.debug(`Attempting final user bind with DN: uid=${username},${AD_BASE_DN}`);
    await client.bind(`uid=${username},${AD_BASE_DN}`, `${password}`);
    const isCandidate = await checkIfVoterIsCandidate(username);
    logger.debug(`Is user: ${username} a candidate? ${isCandidate}`);
    return { username, role: 'voter', authProvider: 'ldap', isCandidate };
  } catch (error) {
    logger.error(`Error authenticating user ${username} via LDAP: ${error.message}`);
    return undefined;
  } finally {
    await client.unbind();
  }
};
