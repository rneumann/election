import { useAuth } from '../context/AuthContext.jsx';

/**
 * Home page after successful authentication.
 * Displays user dashboard with current elections and user information.
 *
 * @returns {React.ReactElement} Home component with dashboard
 */
const Home = () => {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-hka-light-gray">
      {/* Header */}
      <header className="bg-hka-red text-white shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">HKA Wahlsystem</h1>
            <p className="text-sm opacity-90">
              Angemeldet als: <span className="font-semibold">{user?.username}</span> (
              {user?.role === 'admin'
                ? 'Administrator'
                : user?.role === 'committee'
                  ? 'Wahlausschuss'
                  : 'Wähler'}
              )
            </p>
          </div>
          <button
            onClick={logout}
            className="bg-white text-hka-red px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Abmelden
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold text-hka-dark mb-4">Willkommen im HKA Wahlsystem</h2>
          <p className="text-hka-gray mb-6">
            BSI-konformes Online-Wahlsystem für hochschulinterne Wahlen
          </p>

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
            <div className="bg-hka-light-gray p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-hka-dark mb-2">Aktuelle Wahlen</h3>
              <p className="text-hka-gray text-sm">Hier werden verfügbare Wahlen angezeigt</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-hka-dark text-white py-6 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">© 2025 Hochschule Karlsruhe</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
