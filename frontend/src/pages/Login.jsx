import { useState, useRef, useEffect } from 'react';

/**
 * Login-Seite für RZ-Authentifizierung
 * @param {Object} props - Komponenten-Props
 * @param {Function} props.onLogin - Callback-Funktion bei erfolgreicher Anmeldung
 * @returns {JSX.Element} Login-Komponente mit Formular
 */
const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const usernameRef = useRef(null);

  // Auto-Focus auf Username-Feld beim Laden
  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  // Fehler nach 2 Sekunden ausblenden
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        return setError(false);
      }, 2000);
      return () => {
        return clearTimeout(timer);
      };
    }
  }, [error]);

  const handleSubmit = (e) => {
    e.preventDefault();
    //muss noch verbunden werden mit Backend Authentifizierung
    if (username && password) {
      onLogin();
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-hka-light-gray to-white">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-hka-red mb-2">HKA Wahlsystem</h1>
          <p className="text-hka-gray text-sm">
            Bitte melden Sie sich mit Ihrem normalen RZ-Benutzerkürzel an
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-semibold">Fehler bei der Anmeldung</p>
            <p className="text-sm">Ihr Benutzername oder Passwort ist falsch.</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-hka-dark mb-2">
              Benutzerkürzel
            </label>
            <input
              type="text"
              id="username"
              name="username"
              ref={usernameRef}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hka-red focus:border-transparent outline-none"
              placeholder="RZ-Benutzerkürzel"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-hka-dark mb-2">
              RZ-Passwort
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hka-red focus:border-transparent outline-none"
              placeholder="Ihr RZ-Passwort"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-hka-red text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition duration-200 shadow-lg"
          >
            Anmelden
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-hka-gray mt-6">© 2025 Hochschule Karlsruhe</p>
      </div>
    </div>
  );
};

export default Login;
