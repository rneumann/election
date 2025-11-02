import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../hooks/useTheme.js';

/**
 * Login page for RZ authentication.
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
  const { login } = useAuth();
  const theme = useTheme();

  /**
   * Auto-focus on username field when component mounts.
   */
  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-light to-white">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-primary mb-2">
            {theme.institution.name} {theme.text.appTitle}
          </h1>
          <p className="text-brand-gray text-sm">{theme.text.loginSubtitle}</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-semibold">Fehler bei der Anmeldung</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-brand-dark mb-2">
              Benutzerkürzel
            </label>
            <input
              type="text"
              id="username"
              name="username"
              ref={usernameRef}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none"
              placeholder="RZ-Benutzerkürzel"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-brand-dark mb-2">
              RZ-Passwort
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none"
              placeholder="Ihr RZ-Passwort"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-primary text-white py-3 rounded-lg font-semibold hover:opacity-90 transition duration-200 shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Wird angemeldet...' : 'Anmelden'}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-brand-gray mt-6">{theme.text.copyright}</p>
      </div>
    </div>
  );
};

export default Login;
