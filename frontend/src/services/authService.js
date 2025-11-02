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
    const response = await api.post('/auth/login', {
      username: username.trim(),
      password: password.trim(),
    });
    return response.data;
  },

  /**
   * Logout user and clear session data.
   * Currently only clears local storage.
   * Future: May need to call backend logout endpoint.
   *
   * @returns {void}
   */
  logout: () => {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('isAuthenticated');
  },

  /**
   * Get current user from session storage.
   *
   * @returns {{username: string, role: string} | null} Current user or null
   */
  getCurrentUser: () => {
    const user = sessionStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  /**
   * Check if user is authenticated.
   *
   * @returns {boolean} True if user is authenticated
   */
  isAuthenticated: () => sessionStorage.getItem('isAuthenticated') === 'true',
};

export default authService;
