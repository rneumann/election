import { login } from '../auth/auth.js';
import { logger } from '../conf/logger/logger.js';

/**
 * Login route for users, admin and committee.
 * This route expects a POST request with a request body containing
 * the username and password.
 * @param req - The Express request object
 * @param res - The Express response object
 * @param next - The Express next function
 * @returns {Promise<Response>} A Promise resolving to an Express response object
 */
export const loginRoute = async (req, res, next) => {
  logger.debug('Login route accessed');
  try {
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
    const { username, password } = req.body;

    if (!username || !password) {
      logger.warn('Username or password missing in request body');
      return res.status(400).json({ message: 'Username and password are required' });
    }
    const user = await login(username, password);
    if (!user) {
      logger.warn(`Authentication failed for user: ${username}`);
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    logger.info(`User ${username} logged in successfully as ${user.role}`);
    return res.status(200).json({ username: user.username, role: user.role });
  } catch (error) {
    logger.error('Error occurred during login', error);
    next(error);
  }
};
