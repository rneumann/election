import { createContext, useContext, useState } from 'react';
import authService from '../services/authService.js';

/**
 * Authentication context for managing global auth state.
 * Provides user data, authentication status, and auth operations.
 */
const AuthContext = createContext(null);

/**
 * Custom hook to access authentication context.
 * Must be used within AuthProvider.
 *
 * @returns {object} Auth context value with user, login, logout functions
 * @throws {Error} If used outside AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

/**
 * Authentication Provider component.
 * Wraps application and provides auth state to all children.
 *
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactElement} Provider component
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated());
  const [loading] = useState(false);

  /**
   * Login user with username and password.
   * Calls backend API and stores user data in session.
   *
   * @param {string} username - User's RZ-Benutzerkürzel
   * @param {string} password - User's password
   * @returns {Promise<{success: boolean, message?: string}>} Login result
   */
  const login = async (username, password) => {
    try {
      const userData = await authService.login(username, password);

      // Store in session storage
      sessionStorage.setItem('user', JSON.stringify(userData));
      sessionStorage.setItem('isAuthenticated', 'true');

      // Update state
      setUser(userData);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Login failed. Please try again.',
      };
    }
  };

  /**
   * Logout current user.
   * Clears session storage and resets auth state.
   *
   * @returns {void}
   */
  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
