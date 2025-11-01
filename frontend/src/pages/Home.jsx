import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../hooks/useTheme.js';

/**
 * Home page after successful authentication.
 * Displays user dashboard with current elections and user information.
 *
 * @returns {React.ReactElement} Home component with dashboard
 */
const Home = () => {
  const { user, logout } = useAuth();
  const theme = useTheme();
  return (
    <div className="min-h-screen bg-brand-light">
      {/* Header */}
      <header className="bg-brand-primary text-white shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {theme.institution.name} {theme.text.appTitle}
            </h1>
            <p className="text-sm opacity-90">
              Angemeldet als: <span className="font-semibold">{user?.username}</span> (
              {theme.roles[user?.role] || user?.role})
            </p>
          </div>
          <button
            onClick={logout}
            className="bg-white text-brand-primary px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Abmelden
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold text-brand-dark mb-4">{theme.text.welcomeTitle}</h2>
          <p className="text-brand-gray mb-6">{theme.text.welcomeSubtitle}</p>

          {/* User Role Info */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <p className="text-sm text-blue-700">
              <strong>Ihre Rolle:</strong>{' '}
              {user?.role === 'admin' && 'Sie haben vollständigen Administrationszugriff.'}
              {user?.role === 'committee' && 'Sie können Wahlen verwalten und Ergebnisse einsehen.'}
              {user?.role === 'voter' && 'Sie können an verfügbaren Wahlen teilnehmen.'}
            </p>
          </div>

          {/* Info Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <div className="bg-brand-light p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-brand-dark mb-2">Aktuelle Wahlen</h3>
              <p className="text-brand-gray text-sm">Hier werden verfügbare Wahlen angezeigt</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-brand-dark text-white py-6 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">{theme.text.copyright}</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
