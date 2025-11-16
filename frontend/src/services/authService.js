import { logger } from '../conf/logger/logger.js';
import api from './api.js';

/**
 * Authentication service for handling login and logout operations.
 */
const authService = {
  /**
   * Authenticates user via LDAP with username and password.
  
  
   * @param {string} username - User's LDAP username (RZ-Benutzerkürzel)
   * @param {string} password - User's password
   * @returns {Promise<{username: string, role: string, authProvider: string}>} Authenticated user object with role
   * @throws {Error} When authentication fails or network error occurs
   */
  login: async (username, password) => {
    try {
      logger.info(`Login attempt for user: ${username}`);
      const { data } = await api.post('/auth/login/ldap', {
        username: username.trim(),
        password: password.trim(),
      });
      logger.info(`Login successful for user: ${username}`);
      return data.user;
    } catch (error) {
      logger.error(`Login failed for user: ${username}`, error);
      throw error;
    }
  },

  /**
   * Terminates user session on backend and returns provider-specific logout URL.
   *
   *
   * @returns {Promise<string|undefined>} Logout redirect URL for external providers, undefined for internal auth
   * @throws {Error} When backend logout request fails
   */
  logout: async () => {
    try {
      logger.info('Logout initiated');
      const response = await api.delete('/auth/logout', {
        withCredentials: true,
      });
      if (response.status !== 200) {
        throw new Error('Logout failed');
      }
      logger.info('Logout successful');
      return response.data.redirectUrl;
    } catch (error) {
      logger.error('Logout failed:', error);
      throw error;
    }
  },

  /**
   * Retrieves current authenticated user from backend session.
   * Calls /api/auth/me endpoint to verify session validity and get user data.
   *
   * @returns {Promise<{username: string, role: string, authProvider: string}|null>} User object if authenticated, null otherwise
   */
  getCurrentUser: async () => {
    try {
      logger.debug('Fetching current user');
      const { data } = await api.get('/auth/me', {
        withCredentials: true,
      });
      logger.debug('Current user fetched:', data.user?.username);
      return data.user;
    } catch (error) {
      logger.error('Failed to get current user:', error);
      throw error;
    }
  },

  /**
   * Checks if user has valid authentication session.
 
   *
   * @returns {boolean} True if session storage indicates authenticated state
   */
  isAuthenticated: () => sessionStorage.getItem('isAuthenticated') === 'true',
};

export default authService;
