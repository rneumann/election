import 'dotenv/config';
import crypto from 'crypto';
import passport from 'passport';
import axios from 'axios';
import qs from 'qs';
import { logger } from '../conf/logger/logger.js';
import { readSecret } from '../security/secret-reader.js';
const { KC_BASE_URL, KC_REALM, CLIENT_ID, CLIENT_SECRET } = process.env;

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

/* eslint-disable */
/**
 * Login route for users, admin and committee.
 * This route expects a POST request with a request body containing
 * the username and password.
 * @param req - The Express request object
 * @param res - The Express response object
 * @param next - The Express next function
 * @param strategy
 * @returns {Promise<Response>} A Promise resolving to an Express response object
 */
export const loginRoute =
  (strategy = 'ldap') =>
  async (req, res, next) => {
    logger.debug(`Login route accessed with strategy: ${strategy}`);
    if (req.headers['content-type'] !== 'application/json') {
      logger.warn('Invalid Content-Type header');
      return res.status(415).json({ message: 'Content-Type must be application/json' });
    }
    if (!req.body) {
      logger.warn('Request body is missing');
      return res.status(400).json({ message: 'Request body is required' });
    }

    /**
     * Extract username and password from request body
     */
    const { username, password } = req.body;

    if (!username || !password) {
      logger.warn('Username or password missing in request body');
      return res.status(400).json({ message: 'Username and password are required' });
    }

    /**
     *  Try to authenticate the user via passport
     */
    passport.authenticate(strategy, (err, user) => {
      if (err) {
        logger.error('Authentication error:', err);
        return res.status(500).json({ message: 'Authentication error' });
      }
      if (!user) {
        logger.warn('Authentication failed for user:', username);
        return res.status(401).json({ message: 'Authentication failed' });
      }
      req.logIn(user, (err) => {
        if (err) {
          logger.error('Login error:', err);
          return res.status(500).json({ message: 'Login error' });
        }
        logger.debug('User authenticated successfully:', username);
        req.session.sessionSecret = crypto.randomBytes(32).toString('hex');
        req.session.freshUser = true;
        req.session.lastActivity = Date.now();
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
        logger.debug(
          `LDAP set freshUser to true and CSRF token generated: ${req.session.csrfToken}`,
        );
        return res
          .status(200)
          .json({ message: 'Login successful', user, csrfToken: req.session.csrfToken });
      });
    })(req, res, next);
  };

/**
 * Logout route for users.
 * This route expects a GET request and logs out the current user.
 * @param req - The Express request object
 * @param res - The Express response object
 * @returns A Promise resolving to an Express response object
 */
export const logoutRoute = async (req, res) => {
  const user = req.user;
  logger.debug('Logout route accessed');
  logger.debug(`Logging out user: ${JSON.stringify(user)}`);
  req.logout(async (err) => {
    if (err) {
      logger.error('Logout error:', err);
      return res.status(500).json({ message: 'error while logging out' });
    }

    req.session.destroy(async (err) => {
      if (err) {
        logger.error('Session destroy error:', err);
        return res.status(500).json({ message: 'Session destroy error' });
      }
      res.clearCookie('connect.sid', { path: '/', httpOnly: true });

      if (user?.authProvider === 'ldap') {
        res.clearCookie('PHPSESSID', { path: '/', httpOnly: true });
        res.clearCookie('PHPSESSIDIDP', { path: '/', httpOnly: true });
        res.clearCookie('PGADMIN_LANGUAGE', { path: '/', httpOnly: true });
        logger.debug('LDAP user logged out successfully');
        return res.status(200).json({ message: 'Logout successful' });
      }

      // if (user?.authProvider === 'saml') {
      //   res.clearCookie('SimpleSAMLAuthTokenIdp', { path: '/', httpOnly: true });
      //   res.clearCookie('PHPSESSIDIDP', { path: '/', httpOnly: true });
      //   logger.debug('SAML user logged out successfully');
      //   return res.status(200).json({ message: 'Logout successful' });
      // }

      if (user?.authProvider === 'keycloak' && user?.refreshToken) {
        logger.debug(
          `Try to logout user from Keycloak with redirect_uri: ${KC_BASE_URL}/realms/${KC_REALM}/protocol/openid-connect/logout?redirect_uri=${encodeURIComponent('http://localhost:5173/login')}`,
        );

        const response = await axios.post(
          `${KC_BASE_URL}/realms/${KC_REALM}/protocol/openid-connect/logout`,
          qs.stringify({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            refresh_token: user.refreshToken,
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        );
        logger.debug(`Keycloak user logged out successfully: ${response.status}`);
        if (response.status !== 204) {
          return res.status(500).json({ message: 'Logout error' });
        }
        return res.status(200).json({ message: 'Logout successful' });
      }

      // Fallback für andere Auth-Provider
      logger.debug('User logged out successfully and session destroyed');
      return res.status(200).json({ message: 'Logout successful' });
    });
  });
};

/**
 * retrieve role information for the given user
 * @param {String} username the user to look up
 * @param authProvider
 * @returns a user object with username and role
 */
export const getUserInfo = async (username, authProvider) => {
  const adminUser = await getAdminUser();
  const committeeUser = await getCommitteeUser();
  if (username === adminUser.username) {
    return { username: adminUser.username, role: 'admin', authProvider: authProvider };
  }
  if (username === committeeUser.username) {
    return { username: committeeUser.username, role: 'committee', authProvider: authProvider };
  }
  return { username: username, role: 'voter', authProvider: authProvider };
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
