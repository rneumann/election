import { logger } from '../conf/logger/logger.js';
import { handleHttpStatus } from '../utils/exception-handler/exception-handler.js';
import api from './api.js';

/**
 * Authentication service for handling login and logout operations.
 */
const authService = {
  /**
   * Login user with username and password.
   * Sends credentials to backend /api/auth/login endpoint.
   *
   * @param {string} username - User's RZ-Benutzerkürzel
   * @param {string} password - User's password
   * @returns {Promise<{username: string, role: string}>} User data with role (admin, committee, voter)
   * @throws {Error} When authentication fails
   */
  login: async (username, password) => {
    const { data } = await api.post('/auth/login/ldap', {
      username: username.trim(),
      password: password.trim(),
    });
    localStorage.setItem('csrfToken', data.csrfToken);
    return data.user;
  },

  /**
   * Logout user and clear session data.
   * Currently only clears local storage.
   * Future: May need to call backend logout endpoint.
   *
   * @returns {void}
   */
  logout: async () => {
    const response = await api.delete('/auth/logout', {
      withCredentials: true,
    });
    if (response.status !== 200) {
      throw new Error('Logout failed');
    }
    return response.data.redirectUrl;
  },

  /**
   * Retrieves a CSRF token from the backend.
   * If the request fails, it logs the status code and returns undefined.
   * If the request succeeds, it logs the retrieved CSRF token and stores it in local storage.
   * @returns {string | undefined} The retrieved CSRF token or undefined if the request fails.
   */
  getCsrfToken: async () => {
    const csrf = await api.get('/auth/csrf-token', {
      withCredentials: true,
    });
    if (csrf.status !== 200) {
      handleHttpStatus(csrf);
      return undefined;
    }
    return localStorage.setItem('csrfToken', csrf.data.csrfToken);
  },

  /**
   * Get current user from session storage.
   *
   * @returns {{username: string, role: string} | null} Current user or null
   */
  getCurrentUser: async () => {
    const response = await api.get('/auth/me', {
      withCredentials: true,
    });
    if (response.status !== 200) {
      handleHttpStatus(response);
      return undefined;
    }
    return response.data;
  },

  /**
   * Check if user is authenticated.
   *
   * @returns {boolean} True if user is authenticated
   */
  isAuthenticated: () => sessionStorage.getItem('isAuthenticated') === 'true',
};

export default authService;
