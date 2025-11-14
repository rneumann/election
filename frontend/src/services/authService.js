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
    const { data } = await api.post('/auth/login/ldap', {
      username: username.trim(),
      password: password.trim(),
    });
    return data.user;
  },

  /**
   * Terminates user session on backend and returns provider-specific logout URL.
   *
   *
   * @returns {Promise<string|undefined>} Logout redirect URL for external providers, undefined for internal auth
   * @throws {Error} When backend logout request fails
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
   * Retrieves current authenticated user from backend session.
   * Calls /api/auth/me endpoint to verify session validity and get user data.
   *
   * @returns {Promise<{username: string, role: string, authProvider: string}|null>} User object if authenticated, null otherwise
   */
  getCurrentUser: async () => {
    const { data } = await api.get('/auth/me', {
      withCredentials: true,
    });
    return data.user;
  },

  /**
   * Checks if user has valid authentication session.
 
   *
   * @returns {boolean} True if session storage indicates authenticated state
   */
  isAuthenticated: () => sessionStorage.getItem('isAuthenticated') === 'true',
};

export default authService;
