import crypto from 'crypto';
import passport from 'passport';
import { logger } from '../conf/logger/logger.js';
const { KC_BASE_URL, KC_REALM, CLIENT_ID } = process.env;

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
    if (req.method !== 'POST') {
      logger.warn(`Invalid HTTP method: ${req.method}`);
      return res.status(405).json({ message: 'Method Not Allowed' });
    }
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
        logger.debug('LDAP set freshUser to true');
        return res.status(200).json({ message: 'Login successful', user });
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
  logger.debug(`Identity provider: ${user?.authProvider}`);
  req.logout((err) => {
    if (err) {
      logger.error('Logout error:', err);
      return res.status(500).json({ message: 'error while logging out' });
    }

    req.session.destroy((err) => {
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

      if (user?.authProvider === 'saml') {
        res.clearCookie('SimpleSAMLAuthTokenIdp', { path: '/', httpOnly: true });
        logger.debug('SAML user logged out successfully');
        return res.status(200).json({ message: 'Logout successful' });
      }

      if (user?.authProvider === 'keycloak') {
        logger.debug(
          `Try to logout user from Keycloak with redirect_uri: ${KC_BASE_URL}/realms/${KC_REALM}/protocol/openid-connect/logout?redirect_uri=${encodeURIComponent('http://localhost:5173/login')}`,
        );
        //const logoutUrl = `${KC_BASE_URL}/realms/${KC_REALM}/protocol/openid-connect/logout?redirect_uri='http://localhost:5173/login'`;
        const logoutUrl =
          `${KC_BASE_URL}/realms/${KC_REALM}/protocol/openid-connect/logout` +
          `?post_logout_redirect_uri=${encodeURIComponent('http://localhost:5173/login')}` +
          `&client_id=${CLIENT_ID}`;
        logger.debug('Keycloak user logged out locally, redirecting to Keycloak logout');
        return res.status(200).json({ redirectUrl: logoutUrl });
      }

      // Fallback für andere Auth-Provider
      logger.debug('User logged out successfully and session destroyed');
      return res.status(200).json({ message: 'Logout successful' });
    });
  });
};
