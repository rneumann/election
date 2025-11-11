import 'dotenv/config';
import { logger } from '../conf/logger/logger.js';
import { readSecret } from '../security/secret-reader.js';

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
};

/**
 * retrieve role information for the given user
 * @param {String} username the user to look up
 * @returns a user object with username and role
 */
export const getUserInfo = async (username) => {
  const adminUser = await getAdminUser();
  const committeeUser = await getCommitteeUser();
  if (username === adminUser.username) {
    return { username: adminUser.username, role: 'admin' };
  }
  if (username === committeeUser.username) {
    return { username: committeeUser.username, role: 'committee' };
  }
  return { username: username, role: 'voter' };
};

/**
 * Middleware to ensure that a user is authenticated before accessing a route.
 * If the user is authenticated, it calls the next middleware or route handler.
 * If the user is not authenticated, it returns a 401 Unauthorized response with a JSON body containing the message 'Unauthorized'.
 * @param req
 * @param res
 * @param next
 * @returns {Promise<void>}
 */
export const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: 'Unauthorized' });
};

/**
 * Middleware to ensure that a user has a certain role before accessing a route.
 * If the user has one of the allowed roles, it calls the next middleware or route handler.
 * If the user does not have one of the allowed roles, it returns a 403 Forbidden response with a JSON body containing the message 'Forbidden'.
 * @param {string[]} allowedRoles - array of allowed roles
 * @returns {(req: Request, res: Response, next: () => void) => void} middleware function
 */
/* eslint-disable */
export const ensureHasRole =
  (allowedRoles = []) =>
  (req, res, next) => {
    if (!req || !req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    return next();
  };
