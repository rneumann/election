import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService.js';
import api from '../services/api.js';
import { logger } from '../conf/logger/logger.js';

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
  const [user, setUser] = useState(undefined);
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated());
  const [loading, setLoading] = useState(true);

  /**
   * Logout current user.
   * Clears session storage and resets auth state.
   *
   * @returns {void}
   */
  const logout = async () => {
    try {
      // Clear state BEFORE making the API call to prevent any race conditions
      setUser(undefined);
      setIsAuthenticated(false);
      localStorage.removeItem('csrfToken');
      sessionStorage.removeItem('isAuthenticated');

      const response = await api.delete('/auth/logout', { withCredentials: true });
      const redirectUrl = response.data.redirectUrl;

      // Replace the current history entry so "back" button won't work
      window.history.replaceState(null, '', '/login');

      // Hard redirect to Keycloak logout
      window.location.href = redirectUrl;
    } catch {
      // Even if logout fails, clear local state
      setUser(undefined);
      setIsAuthenticated(false);
      localStorage.removeItem('csrfToken');
      sessionStorage.removeItem('isAuthenticated');

      // Redirect to login page
      window.location.href = '/login';
    }
  };

  /**
   * Validate existing session on mount.
   * Checks if backend is reachable and session is still valid.
   * If backend is down or session invalid, logout user.
   */
  useEffect(() => {
    const validateSession = async () => {
      try {
        const me = await fetchMe();
        if (me.authenticated) {
          setUser(me.user);
          setIsAuthenticated(true);
        } else {
          setUser(undefined);
          setIsAuthenticated(false);
        }
      } catch {
        setUser(undefined);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    validateSession();
  }, []);

  useEffect(() => {
    // Heartbeat nur aktiv, wenn User eingeloggt ist
    if (!isAuthenticated) {
      return;
    }
    logger.debug('Starting session heartbeat interval');
    const interval = setInterval(
      async () => {
        try {
          const { data } = await api.get('/auth/me', { withCredentials: true });

          if (!data?.authenticated) {
            logger.debug('Session heartbeat: invalid → logout');
            logout();
          }
        } catch {
          logger.debug('Session heartbeat: error or 401 → logout');
          logout();
        }
      },
      (3 * 60 + 10) * 1000,
    ); // 3 min 10 sec

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  /**
   * Login user with username and password.
   * Calls backend API and stores user data in session.
   *
   * @param {string} username - User's RZ-Benutzerkürzel
   * @param {string} password - User's password
   * @returns {Promise<{success: boolean, message?: string}>} Login result
   */
  const login = async (username, password) => {
    const ERROR_INVALID_CREDENTIALS = 'Benutzername oder Passwort ist falsch.';

    try {
      const user = await authService.login(username, password);

      if (user && user.username) {
        setUser(user);
        setIsAuthenticated(true);
        sessionStorage.setItem('isAuthenticated', 'true');

        logger.debug(`CSRF From local storage: ${localStorage.getItem('csrfToken')}`);

        return { success: true, user };
      } else {
        return { success: false, message: ERROR_INVALID_CREDENTIALS };
      }
    } catch (error) {
      logger.error('Login failed:', error);

      // Check for specific error codes/messages
      if (error.response?.status === 401) {
        return {
          success: false,
          message: ERROR_INVALID_CREDENTIALS,
        };
      } else if (error.response?.status === 500) {
        return {
          success: false,
          message: 'Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
        };
      } else if (error.code === 'ERR_NETWORK' || error.message.includes('Network')) {
        return {
          success: false,
          message:
            'Keine Verbindung zum Server möglich. Bitte überprüfen Sie Ihre Internetverbindung.',
        };
      }

      return {
        success: false,
        message: ERROR_INVALID_CREDENTIALS,
      };
    }
  };

  const fetchMe = async () => {
    const { data } = await api.get('/auth/me', {
      withCredentials: true,
    });
    return data;
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
