import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../hooks/useTheme.js';
import ResponsiveButton from '../components/ResponsiveButton.jsx';

/**
 * Login page for user authentication.
 * Handles user login with backend API integration.
 *
 * @returns {React.ReactElement} Login component with form
 */
const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const usernameRef = useRef(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const theme = useTheme();

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
   * Clear error message after 5 seconds.
   */
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        return setError('');
      }, 5000);
      return () => {
        return clearTimeout(timer);
      };
    }
  }, [error]);

  /**
   * Handle login form submission.
   * Calls backend API via AuthContext and redirects on success.
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
        // Redirect to home page on successful login
        navigate('/home');
      } else {
        // Show error message from backend
        setError(result.message || 'Login failed. Please try again.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-light via-gray-50 to-white px-4 sm:px-6 py-8">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-100">
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
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-primary mb-2">
            {theme.institution.name} {theme.text.appTitle}
          </h1>
          <p className="text-brand-gray text-xs sm:text-sm">{theme.text.loginSubtitle}</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded-r mb-4 flex items-start gap-3 animate-pulse">
            <svg
              className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-semibold text-sm">Fehler bei der Anmeldung</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-brand-dark mb-2">
              Benutzername
            </label>
            <input
              type="text"
              id="username"
              name="username"
              ref={usernameRef}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-shadow duration-200 hover:border-brand-primary"
              placeholder="Ihr Benutzername"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-brand-dark mb-2">
              Passwort
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-shadow duration-200 hover:border-brand-primary"
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

        <ResponsiveButton
          onClick={() => (window.location.href = '/api/auth/login/saml')}
          className="mt-4 w-full bg-brand-primary text-white py-3 rounded-lg font-semibold hover:opacity-90 transition duration-200 shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {'Anmelden mit SAML'}
        </ResponsiveButton>

        <ResponsiveButton
          onClick={() => (window.location.href = '/api/auth/login/kc')}
          className="mt-4 w-full bg-brand-primary text-white py-3 rounded-lg font-semibold hover:opacity-90 transition duration-200 shadow-lg"
        >
          Anmelden mit Keycloak
        </ResponsiveButton>

        {/* Footer */}
        <p className="text-center text-xs sm:text-sm text-brand-gray mt-4 sm:mt-6">
          {theme.text.copyright}
        </p>
      </div>
    </div>
  );
};

export default Login;
