/**
 * Home-Seite nach erfolgreicher Authentifizierung
 * @param {Object} props - Komponenten-Props
 * @param {Function} props.onLogout - Callback-Funktion für Logout
 * @returns {JSX.Element} Home-Komponente mit Dashboard
 */
const Home = ({ onLogout }) => {
  return (
    <div className="min-h-screen bg-hka-light-gray">
      {/* Header */}
      <header className="bg-hka-red text-white shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold"> HKA Wahlsystem</h1>
          <button
            onClick={onLogout}
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
