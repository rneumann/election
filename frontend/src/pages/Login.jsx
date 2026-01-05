import { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PersonStanding } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../hooks/useTheme.js';
import ResponsiveButton from '../components/ResponsiveButton.jsx';
import { logger } from '../conf/logger/logger.js';
import { AccessibilityProvider, AccessibilityContext } from '../context/AccessibilityContext.jsx';
import AccessibilityMenu from '../components/AccessibilityMenu.jsx';
import api from '../services/api.js';
import { handleHttpStatus } from '../utils/exception-handler/exception-handler.js';

/**
 * Login page for user authentication.
 * Handles user login with backend API integration.
 *
 * @returns Login form with LDAP, SAML, and Keycloak authentication options
 */
const LoginContent = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [authProvider, setAuthProvider] = useState(undefined);
  const [loading, setLoading] = useState(false);
  const [isAccessibilityMenuOpen, setAccessibilityMenuOpen] = useState(false);
  const usernameRef = useRef(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const theme = useTheme();
  const { settings } = useContext(AccessibilityContext);

  // Apply accessibility settings
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('data-text-scale', settings.textSize.toString());

    return () => {
      html.removeAttribute('data-text-scale');
    };
  }, [settings]);

  // Build accessibility classes
  const accessibilityClasses = [
    settings.lineHeight === 1 ? 'accessibility-line-height-1' : '',
    settings.lineHeight === 1.3 ? 'accessibility-line-height-1-3' : '',
    settings.lineHeight === 1.6 ? 'accessibility-line-height-1-6' : '',
  ]
    .filter(Boolean)
    .join(' ');

  /**
   * Auto-focus on username field when component mounts.
   */
  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  /**
   * Handle technical errors from URL parameters (from AuthCallback).
   * Only displays errors for technical issues, not auth provider failures
   * (those are already shown by the external auth provider).
   */
  useEffect(() => {
    const errorParam = searchParams.get('error');

    // Only show technical errors - auth provider errors are already displayed by provider
    if (errorParam === 'session_invalid' || errorParam === 'validation_failed') {
      setError('Ein technischer Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    }
  }, [searchParams]);

  /**
   * Handle login form submission.
   * Calls backend API via AuthContext and redirects on success.
   * Redirects to returnUrl from query params if present, otherwise to /home for users or /admin for admins.
   *
   * @param {React.FormEvent} e - Form submit event
   * @returns {Promise<void>}
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(username, password);

      if (result.success) {
        // Check if user is admin - admins cannot login to user frontend
        if (result.user?.role === 'admin') {
          setError('Admins können sich nicht im Wähler-Frontend anmelden.');
          setLoading(false);
          return;
        }

        // Check if there's a return URL from query params
        const returnUrl = searchParams.get('returnUrl');

        // Redirect regular users
        const destination = returnUrl && returnUrl.startsWith('/') ? returnUrl : '/home';
        navigate(destination, { replace: true });
      } else {
        // Show error message from backend
        setError(result.message || 'Benutzername oder Passwort ist falsch.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchAuthProvider = async () => {
      const cachedProvider = localStorage.getItem('authProvider');
      if (cachedProvider) {
        setAuthProvider(cachedProvider);
      }

      try {
        const response = await api.get('/config/auth-provider');

        if (response.status === 200) {
          const newProvider = response.data.authProvider;

          if (newProvider !== cachedProvider) {
            setAuthProvider(newProvider);
            localStorage.setItem('authProvider', newProvider);
          }
        }
      } catch (error) {
        if (!cachedProvider) {
          handleHttpStatus(error.response);
        }
      }
    };

    fetchAuthProvider();
  }, []);

  return (
    <div
      className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-light dark:bg-gray-900 via-gray-50 to-white px-4 sm:px-6 py-8 transition-colors ${accessibilityClasses}`}
    >
      {/* Accessibility Button - Fixed Position Top Right */}
      <div className="fixed top-4 right-4 z-30">
        <ResponsiveButton
          toolTip="Barrierefreiheit"
          toolTipPlacement="bottom"
          variant="secondary"
          size="icon"
          onClick={() => setAccessibilityMenuOpen(true)}
          className="shadow-lg"
        >
          <PersonStanding className="text-brand-primary w-6 h-6" />
        </ResponsiveButton>
      </div>

      <div className="login-content bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-700 transition-colors">
        {/* Logo/Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-primary rounded-full mb-4 shadow-lg">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-primary dark:text-white mb-2 transition-colors">
            {theme.institution.name} {theme.text.appTitle}
          </h1>
          <p className="text-brand-gray dark:text-gray-300 text-xs sm:text-sm transition-colors">
            {theme.text.loginSubtitle}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div role="alert" aria-live="assertive" className="mb-4 animate-slide-in">
            <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-lg shadow-md overflow-hidden">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-red-900 mb-1">
                      Anmeldung fehlgeschlagen
                    </h3>
                    <p className="text-sm text-red-800">{error}</p>
                  </div>

                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={() => setError('')}
                    className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
                    aria-label="Fehlermeldung schließen"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {authProvider === undefined && (
          <div role="alert" aria-live="assertive" className="mb-4 animate-slide-in">
            <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-500 rounded-lg shadow-md overflow-hidden">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-yellow-900 mb-1">
                      Anmeldung fehlgeschlagen
                    </h3>
                    <p className="text-sm text-yellow-800">
                      Es ist kein Authentifizierungs-Provider konfiguriert. Bitte kontaktieren Sie
                      Ihren Administrator.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Login Form */}
        {authProvider === 'ldap' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-brand-dark dark:text-gray-200 mb-2 transition-colors"
              >
                Benutzername
              </label>
              <input
                type="text"
                id="username"
                name="username"
                autoComplete="username"
                ref={usernameRef}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) {
                    setError('');
                  }
                }}
                className="w-full px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-shadow duration-200 hover:border-brand-primary"
                placeholder="Ihr Benutzername"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-brand-dark dark:text-gray-200 mb-2 transition-colors"
              >
                Passwort
              </label>
              <input
                type="password"
                id="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) {
                    setError('');
                  }
                }}
                className="w-full px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-shadow duration-200 hover:border-brand-primary"
                placeholder="Ihr Passwort"
                required
              />
            </div>

            <ResponsiveButton
              type="submit"
              variant="primary"
              size="large"
              fullWidth
              disabled={loading}
            >
              {loading ? 'Wird angemeldet...' : 'Anmelden'}
            </ResponsiveButton>
          </form>
        )}

        {/* Keycloak Login Button - only show if enabled via env var */}
        {authProvider === 'keycloak' && (
          <ResponsiveButton
            onClick={() => (window.location.href = '/api/auth/login/kc')}
            className="mt-4 w-full bg-brand-primary text-white py-3 rounded-lg font-semibold hover:opacity-90 transition duration-200 shadow-lg"
          >
            Anmelden mit Keycloak
          </ResponsiveButton>
        )}

        {/* Footer */}
        <p className="text-center text-xs sm:text-sm text-brand-gray dark:text-gray-400 mt-4 sm:mt-6 transition-colors">
          {theme.text.copyright}
        </p>
      </div>

      {/* Accessibility Sidebar */}
      <AccessibilityMenu
        isOpen={isAccessibilityMenuOpen}
        onClose={() => setAccessibilityMenuOpen(false)}
      />
    </div>
  );
};

const Login = () => (
  <AccessibilityProvider>
    <LoginContent />
  </AccessibilityProvider>
);

export default Login;
