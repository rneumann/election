import { logger } from '../conf/logger/logger.js';

/**
 * Verifies the CSRF token sent in the request headers against the one stored in the session.
 * If the tokens do not match, it returns a 403 Forbidden response.
 * If the tokens match, it calls the next middleware or route handler.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
export const verifyCsrfToken = (req, res, next) => {
  if (!req.session) {
    logger.warn('No session available for CSRF check');
    return res.status(403).json({ message: 'Forbidden' });
  }
  const token = req.headers['x-csrf-token'];

  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  if (
    req.path === '/api/auth/login/ldap' ||
    req.path === '/api/auth/login/kc' ||
    req.path === '/api/auth/logout'
  ) {
    return next();
  }
  if (!token || token !== req.session.csrfToken) {
    logger.debug('CSRF token verification failed');
    return res.status(403).json({ message: 'Forbidden' });
  }
  logger.debug('CSRF token verification succeeded');
  next();
};
