import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../hooks/useTheme.js';
import CountingSection from '../components/counting/CountingSection.jsx';
import FileUploadSection from '../components/upload/FileUploadSection.jsx';
import ResponsiveButton from '../components/ResponsiveButton.jsx';
import {
  validateVoterCSV,
  validateCandidateCSV,
  transformCandidateFile,
  transformVoterFile,
} from '../utils/validators/csvValidator.js';
import { validateElectionExcel } from '../utils/validators/excelValidator.js';
import { TestElectionAdminView } from '../components/TestElectionAdminView.jsx';
import { TestElectionCountingAdminView } from '../components/TestElectionCountingAdminView.jsx';

/**
 * Admin Dashboard - Main admin interface
 *
 * Features:
 * - Election vote counting
 * - File uploads for voters/candidates/elections
 * - Template downloads
 * - Database management (placeholder)
 * - Audit logs navigation
 * - Navigation sidebar with grouped sections
 *
 * @returns {React.ReactElement} Admin dashboard page
 */
const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('counting');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Counting section state
  const [elections, setElections] = useState([]);
  const [loadingElections, setLoadingElections] = useState(false);
  const [countingElectionId, setCountingElectionId] = useState(null);
  const [countingError, setCountingError] = useState('');

  /**
   * Get navigation button style
   *
   * @param {string} section - Section identifier
   * @returns {object} Style object
   */
  const getNavButtonStyle = (section) => ({
    backgroundColor: activeSection === section ? theme.colors.primary : 'transparent',
    color: activeSection === section ? '#ffffff' : theme.colors.dark,
  });

  /**
   * Handle section change
   *
   * @param {string} section - Section identifier
   */
  const handleSectionChange = (section) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-brand-primary text-white shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Bar */}
          <div className="flex items-center justify-between py-5">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-white hover:text-gray-200"
                aria-label="Toggle menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-white">Verwaltungsbereich</h1>
                <p className="text-xs sm:text-sm text-gray-100 mt-0.5 opacity-90">
                  {user?.username} · {theme.roles[user?.role]}
                </p>
              </div>
            </div>
            <div>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-white hover:text-gray-200 border border-white/30 rounded hover:bg-white/10 transition-colors"
              >
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Left Sidebar - Menu */}
          <aside
            className={`
            lg:w-72 lg:flex-shrink-0
            ${mobileMenuOpen ? 'block' : 'hidden lg:block'}
          `}
          >
            <div className="bg-white border border-gray-200 lg:sticky lg:top-8">
              <div className="border-b border-gray-200 px-5 py-4">
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  Navigation
                </h2>
                <p className="text-xs text-gray-500 mt-1">Funktionen zur Wahlverwaltung</p>
              </div>

              <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                <p className="text-xs text-gray-700 leading-relaxed">
                  Die folgende Liste enthält alle notwendigen Funktionen zur Einrichtung/Änderung
                  von Wahlen. Um eine neue Wahl einzurichten, folgen Sie einfach den Schritten in
                  der angegebenen Reihenfolge.
                </p>
              </div>

              <nav className="p-2">
                {/* Sicherheit */}
                <div className="mt-8 border-t pt-4">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Sicherheit
                  </div>
                  <button
                    onClick={() => navigate('/admin/audit')}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50 text-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-red-50 p-1.5 rounded-md text-brand-primary">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                          />
                        </svg>
                      </div>
                      <div>
                        <span className="block text-gray-900">Audit Logs</span>
                        <span className="text-xs text-gray-500 font-normal">
                          Sicherheitsprotokolle einsehen
                        </span>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Verwaltung */}
                <div className="mb-6">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Verwaltung
                  </div>
                  <button
                    onClick={() => handleSectionChange('clear')}
                    style={getNavButtonStyle('clear')}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span>Datenbank leeren</span>
                      <span className="text-xs opacity-60">1</span>
                    </div>
                  </button>
                </div>

                <div className="mb-6">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Testwahlen
                  </div>

                  <button
                    /* eslint-disable */
                    onClick={() => handleSectionChange('test-election')}
                    style={getNavButtonStyle('test-election')}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span>Steuern</span>
                      <span className="text-xs opacity-60">2.1</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleSectionChange('test-election-counting')}
                    style={getNavButtonStyle('test-election-counting')}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span>Auszählen</span>
                      <span className="text-xs opacity-60">2.2</span>
                    </div>
                  </button>
                </div>

                {/* Wahlen definieren */}
                <div className="mb-6">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Wahlen definieren
                  </div>
                  <button
                    onClick={() => handleSectionChange('template')}
                    style={getNavButtonStyle('template')}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span>Excel-Vorlage herunterladen</span>
                      <span className="text-xs opacity-60">3.1</span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleSectionChange('definition')}
                    style={getNavButtonStyle('definition')}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span>Wahleinstellung hochladen</span>
                      <span className="text-xs opacity-60">3.2</span>
                    </div>
                  </button>
                </div>

                {/* Wählerverzeichnis */}
                <div className="mb-6">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Wählerverzeichnis
                  </div>
                  <button
                    onClick={() => handleSectionChange('upload')}
                    style={getNavButtonStyle('upload')}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span>CSV-Datei hochladen</span>
                      <span className="text-xs opacity-60">4.1</span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleSectionChange('download')}
                    style={getNavButtonStyle('download')}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span>Wählerverzeichnis herunterladen</span>
                      <span className="text-xs opacity-60">4.2</span>
                    </div>
                  </button>
                </div>

                {/* Kandidatenverzeichnis */}
                <div className="mb-6">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Kandidatenverzeichnis
                  </div>
                  <button
                    onClick={() => handleSectionChange('uploadCandidates')}
                    style={getNavButtonStyle('uploadCandidates')}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span>CSV-Datei hochladen</span>
                      <span className="text-xs opacity-60">5.1</span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleSectionChange('downloadCandidates')}
                    style={getNavButtonStyle('downloadCandidates')}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span>Kandidatenverzeichnis herunterladen</span>
                      <span className="text-xs opacity-60">5.2</span>
                    </div>
                  </button>
                </div>

                {/* Auszählung */}
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Auszählung
                  </div>
                  <button
                    onClick={() => handleSectionChange('counting')}
                    style={getNavButtonStyle('counting')}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span>Wahlergebnisse auszählen</span>
                      <span className="text-xs opacity-60">6</span>
                    </div>
                  </button>
                </div>
              </nav>
            </div>
          </aside>

          {/* Right Content Area */}
          <div className="flex-1 w-full lg:w-auto">
            {/* Datenbank leeren Section */}
            {activeSection === 'clear' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-xl font-bold text-gray-900">Datenbank leeren</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Alle Daten aus der Datenbank entfernen, einschließlich Wahleinstellungen,
                    Stimmzettel, Wähler, Kandidaten usw.
                  </p>
                </div>
                <div className="p-6">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <div className="flex gap-3">
                      <svg
                        className="w-5 h-5 text-yellow-600 flex-shrink-0"
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
                      <div className="text-sm text-yellow-900">
                        <p className="font-semibold mb-1">Warnung:</p>
                        <p className="text-yellow-800">
                          Sie werden aufgefordert, diesen Schritt zu bestätigen, um die Daten nicht
                          versehentlich zu löschen.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                      <svg
                        className="w-8 h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </div>
                    <p className="text-gray-600 mb-6">
                      Diese Funktion wird demnächst verfügbar sein.
                    </p>
                    <ResponsiveButton variant="outline" size="medium" disabled>
                      Bald verfügbar
                    </ResponsiveButton>
                  </div>
                </div>
              </div>
            )}

            {/* Excel-Vorlage herunterladen Section */}
            {activeSection === 'template' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-xl font-bold text-gray-900">Excel-Vorlage herunterladen</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Excel-Vorlage für eine Wahleinstellung herunterladen
                  </p>
                </div>

                <div className="p-6">
                  {/* Download Card */}
                  <div className="bg-gray-50 border border-gray-300 rounded-lg p-8 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-200 mb-4">
                      <svg
                        className="w-10 h-10 text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-6">
                      Excel-Vorlage für Wahleinstellungen
                    </h3>
                    <a
                      href="/templates/ElectionInfoTemplate.xlsx"
                      download="ElectionInfoTemplate.xlsx"
                      className="inline-block"
                    >
                      <button
                        style={{ backgroundColor: theme.colors.primary }}
                        className="px-6 py-3 text-white font-medium rounded hover:opacity-90 transition-opacity"
                      >
                        <div className="flex items-center gap-2">
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                          <span>Vorlage herunterladen (.xlsx)</span>
                        </div>
                      </button>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Wahleinstellung hochladen Section */}
            {activeSection === 'definition' && (
              <FileUploadSection
                key="upload-elections"
                title="Wahleinstellung hochladen"
                description="Laden Sie eine Excel-Datei (.xlsx) mit der Wahlkonfiguration hoch. Die Datei wird automatisch validiert."
                uploadType="elections"
                endpoint="/upload/elections"
                validator={validateElectionExcel}
                acceptedFileTypes=".xlsx,.xls"
                formatExample="Siehe Excel-Vorlage (Download über Menü)"
                fileTypeLabel="Excel"
              />
            )}

            {/* Wähler CSV hochladen Section */}
            {activeSection === 'upload' && (
              <FileUploadSection
                key="upload-voters"
                title="Wählerverzeichnis hochladen"
                description="CSV-Datei mit den Wählern hochladen und einer zukünftigen Wahl zuordnen. Die Datei muss aus einer Kopfzeile und den folgenden, durch Komma getrennten Spalten bestehen:"
                uploadType="voters"
                endpoint="/upload/voters"
                validator={validateVoterCSV}
                transformer={transformVoterFile}
                acceptedFileTypes=".csv"
                formatExample="RZ-Kennung,Fakultät,Vorname,Nachname,Matk.Nr,Studienganskürzel,Studiengang"
                formatExampleData="abcd1234,AB,Max,Mustermann,123456,ARTB,Architektur"
                fileTypeLabel="CSV"
                requiresElection={true}
                electionFilter="future"
              />
            )}

            {/* Wählerverzeichnis herunterladen Section */}
            {activeSection === 'download' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    Wählerverzeichnis herunterladen
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Aktuelles Wählerverzeichnis als Excel-Dokument herunterladen (enthält ein
                    Tabellenblatt pro Fakultät/Studiengang)
                  </p>
                </div>
                <div className="p-6">
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                      <svg
                        className="w-8 h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </div>
                    <p className="text-gray-600 mb-6">
                      Diese Funktion wird demnächst verfügbar sein.
                    </p>
                    <ResponsiveButton variant="outline" size="medium" disabled>
                      Bald verfügbar
                    </ResponsiveButton>
                  </div>
                </div>
              </div>
            )}

            {/* Kandidaten CSV hochladen Section */}
            {activeSection === 'uploadCandidates' && (
              <FileUploadSection
                key="upload-candidates"
                title="Kandidatenverzeichnis hochladen"
                description="CSV-Datei mit Kandidaten hochladen. Die Datei muss aus einer Kopfzeile und den folgenden, durch Komma getrennten Spalten bestehen:"
                uploadType="candidates"
                endpoint="/upload/candidates"
                validator={validateCandidateCSV}
                transformer={transformCandidateFile}
                acceptedFileTypes=".csv"
                formatExample="Nachname,Vorname,MatrikelNr,Fakultät,Schlüsselworte,Notizen,IstZugelassen"
                formatExampleData='Mustermann,Max,123456,AB,"Umwelt, Digitalisierung","Bemerkung",true'
                fileTypeLabel="CSV"
              />
            )}

            {/* Kandidatenverzeichnis herunterladen Section */}
            {activeSection === 'downloadCandidates' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    Kandidatenverzeichnis herunterladen
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Aktuelles Kandidatenverzeichnis als Excel-Dokument herunterladen (enthält ein
                    Tabellenblatt pro Fakultät/Studiengang)
                  </p>
                </div>
                <div className="p-6">
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                      <svg
                        className="w-8 h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </div>
                    <p className="text-gray-600 mb-6">
                      Diese Funktion wird demnächst verfügbar sein.
                    </p>
                    <ResponsiveButton variant="outline" size="medium" disabled>
                      Bald verfügbar
                    </ResponsiveButton>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'test-election' && <TestElectionAdminView />}
            {activeSection === 'test-election-counting' && (
              <TestElectionCountingAdminView
                theme={theme}
                //elections={elections}
                //setElections={setElections}
                loadingElections={loadingElections}
                setLoadingElections={setLoadingElections}
                countingElectionId={countingElectionId}
                setCountingElectionId={setCountingElectionId}
                countingError={countingError}
                setCountingError={setCountingError}
              />
            )}

            {/* Counting Section */}
            {activeSection === 'counting' && (
              <CountingSection
                theme={theme}
                elections={elections}
                setElections={setElections}
                loadingElections={loadingElections}
                setLoadingElections={setLoadingElections}
                countingElectionId={countingElectionId}
                setCountingElectionId={setCountingElectionId}
                countingError={countingError}
                setCountingError={setCountingError}
              />
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
            <div>{theme.text.copyright}</div>
            <div>Version 1.0.0</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AdminDashboard;
