//NEU ANFANG (templates)
import { useEffect, useCallback } from 'react';
//NEU ENDE (templates)
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
import { adminService } from '../services/adminApi.js';
import { Alert } from '../components/Alert.jsx';
import { logger } from '../conf/logger/logger.js';
import { useAlert } from '../context/AlertContext.jsx';
import { DeleteDataView } from '../components/DeleteDataView.jsx';
//NEU ANFANG (templates)
import { templateApi } from '../services/templateApi.js';
import IntegrityCheckView from '../components/IntegrityCheckView.jsx';
import ElectionOverview from '../components/ElectionOverview.jsx';
import ElectionTemplateBuilder from '../components/ElectionTemplateBuilder.jsx';
import VoterUploadMulti from '../components/VoterUploadMulti.jsx';
//NEU ENDE (templates)

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
  const [showConfirmAlert, setShowConfirmAlert] = useState(false);
  // NEU ANFANG (templates)
  const [templateType, setTemplateType] = useState('generic');
  const [templateFormat, setTemplateFormat] = useState('ods');
  const [selectedConfigFile, setSelectedConfigFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  // NEU ENDE (templates)
  const [activeSection, setActiveSection] = useState('counting');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { showAlert } = useAlert();
  // Counting section state
  const [elections, setElections] = useState([]);
  const [loadingElections, setLoadingElections] = useState(false);
  const [countingElectionId, setCountingElectionId] = useState(null);
  const [countingError, setCountingError] = useState('');

  const [loadingDeletionElections, setLoadingDeletionElections] = useState(false);
  const [selectedElectionForDeletion, setSelectedElectionForDeletion] = useState('all');
  const [electionsForDeletion, setElectionsForDeletion] = useState([]);

  // NEU ANFANG (templates)
  const [presetOptions, setPresetOptions] = useState({ internal: [], external: [] });

  // Funktion zum Laden der Presets
  const fetchPresets = useCallback(async () => {
    try {
      const presets = await templateApi.getAvailablePresets();
      // Handle both old array format and new object format
      if (presets && typeof presets === 'object' && !Array.isArray(presets)) {
        setPresetOptions(presets);
      } else if (Array.isArray(presets)) {
        // Convert array format to new object format for backward compatibility
        setPresetOptions({
          internal: presets.map((p) => ({ key: p, info: p.toUpperCase() })),
          external: [],
        });
      } else {
        setPresetOptions({ internal: [], external: [] });
      }
    } catch {
      logger.error('Fehler beim Laden der Presets');
      setPresetOptions({ internal: [], external: [] });
    }
  }, []);

  // Lade Presets beim Mount
  useEffect(() => {
    fetchPresets();
    // fetchPresets ist stabil (useCallback ohne deps), daher kein Re-render-Loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExportElections = async (format) => {
    try {
      await templateApi.exportElections(format);
      showAlert('success', 'Wahlen erfolgreich exportiert');
    } catch {
      showAlert('error', 'Fehler beim Export der Wahlen');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      if (templateType === 'voters') {
        await templateApi.downloadVoterTemplate(templateFormat);
      } else {
        await templateApi.downloadElectionTemplate(templateType, templateFormat);
      }
      showAlert('success', 'Vorlage erfolgreich heruntergeladen');
    } catch {
      showAlert('error', 'Fehler beim Download');
    }
  };

  const handleUploadConfig = async () => {
    if (!selectedConfigFile) {
      return;
    }
    try {
      await templateApi.uploadConfig(selectedConfigFile);
      setUploadStatus('Erfolg: Konfiguration wurde aktualisiert!');
      setSelectedConfigFile(null);
      await fetchPresets();
      setTimeout(() => setUploadStatus(''), 5000);
    } catch {
      setUploadStatus('Fehler: Upload fehlgeschlagen.');
    }
  };
  // NEU ENDE (templates)

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

  const handleDeleteAllData = async () => {
    try {
      await adminService.deleteAllData(selectedElectionForDeletion);
      setShowConfirmAlert(false);
      showAlert('success', 'Data deleted successfully');
      fetchElectionsForDeletion();
    } catch (error) {
      logger.error('Error deleting data:', error);
      setShowConfirmAlert(false);
      showAlert('error', 'Error deleting data');
      fetchElectionsForDeletion();
    }
  };

  const fetchElectionsForDeletion = async () => {
    setLoadingDeletionElections(true);
    const elections = await adminService.getElectionsForAdmin();
    setElectionsForDeletion(elections);
    setSelectedElectionForDeletion('all');
    setLoadingDeletionElections(false);
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
              </div>

              <nav className="p-2">

                {/* Wahlen vorbereiten */}
                <div className="mb-6">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Wahlen vorbereiten
                  </div>
                  <button onClick={() => handleSectionChange('templateBuilder')} style={getNavButtonStyle('templateBuilder')} className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50">
                    <span>Vorlage erstellen</span>
                  </button>
                  <button onClick={() => handleSectionChange('template')} style={getNavButtonStyle('template')} className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50">
                    <span>Vordefinierte Vorlage herunterladen</span>
                  </button>
                </div>

                {/* Wahlen einrichten */}
                <div className="mb-6">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Wahlen einrichten
                  </div>
                  <button onClick={() => handleSectionChange('definition')} style={getNavButtonStyle('definition')} className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50">
                    <span>Wahleinstellung hochladen</span>
                  </button>
                  <button onClick={() => handleSectionChange('upload')} style={getNavButtonStyle('upload')} className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50">
                    <span>Wählerverzeichnis hochladen</span>
                  </button>
                  <button onClick={() => handleSectionChange('download')} style={getNavButtonStyle('download')} className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50">
                    <span>Wählerverzeichnis herunterladen</span>
                  </button>
                  <button onClick={() => handleSectionChange('uploadCandidates')} style={getNavButtonStyle('uploadCandidates')} className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50">
                    <span>Kandidatenverzeichnis hochladen</span>
                  </button>
                  <button onClick={() => handleSectionChange('downloadCandidates')} style={getNavButtonStyle('downloadCandidates')} className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50">
                    <span>Kandidatenverzeichnis herunterladen</span>
                  </button>
                </div>

                {/* Wahlen testen */}
                <div className="mb-6">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Wahlen testen
                  </div>
                  <button onClick={() => handleSectionChange('test-election')} style={getNavButtonStyle('test-election')} className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50">
                    <span>Testwahlen steuern</span>
                  </button>
                  <button onClick={() => handleSectionChange('test-election-counting')} style={getNavButtonStyle('test-election-counting')} className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50">
                    <span>Testwahlen auszählen</span>
                  </button>
                  <button
                    onClick={() => handleSectionChange('exportElections')}
                    style={getNavButtonStyle('exportElections')}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span>Wahlen exportieren</span>
                      <span className="text-xs opacity-60">3.4</span>
                    </div>
                  </button>
                </div>

                {/* Wahlen durchführen */}
                <div className="mb-6">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Wahlen durchführen
                  </div>
                  <button onClick={() => handleSectionChange('overview')} style={getNavButtonStyle('overview')} className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50">
                    <span>Wahlübersicht</span>
                  </button>
                  <button disabled className="w-full text-left px-3 py-2.5 text-sm font-medium text-gray-300 cursor-not-allowed" title="Noch nicht implementiert">
                    <span>Wahl unterbrechen</span>
                    <span className="ml-2 text-xs text-gray-300">(in Arbeit)</span>
                  </button>
                  <button onClick={() => handleSectionChange('counting')} style={getNavButtonStyle('counting')} className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50">
                    <span>Wahlergebnisse auszählen</span>
                  </button>
                </div>

                {/* Administratives */}
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Administratives
                  </div>
                  <button onClick={() => handleSectionChange('clear')} style={getNavButtonStyle('clear')} className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50">
                    <span>Datenbankbereinigung</span>
                  </button>
                  <button onClick={() => setActiveSection('config')} style={getNavButtonStyle('config')} className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50">
                    <span>Wahl-Parameter Konfiguration</span>
                  </button>
                  <button onClick={() => handleSectionChange('integrity')} style={getNavButtonStyle('integrity')} className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50">
                    <span>Integritätsprüfung</span>
                  </button>
                  <button onClick={() => navigate('/admin/audit')} className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50 text-gray-700">
                    <span>Audit-Logs</span>
                  </button>
                </div>

              </nav>
            </div>
          </aside>

          {/* Right Content Area */}
          <div className="flex-1 w-full lg:w-auto">
            {/* Datenbereinigung Section */}
            {activeSection === 'overview' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-xl font-bold text-gray-900">Wahlübersicht</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Alle definierten Wahlen mit Wähler- und Stimmzettelzählung.
                  </p>
                </div>
                <ElectionOverview />
              </div>
            )}

            {activeSection === 'clear' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-xl font-bold text-gray-900">Datenbankbereinigung</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Alle Daten aus der Datenbank entfernen, einschließlich Wahleinstellungen,
                    Stimmzettel, Wähler, Kandidaten usw.
                  </p>
                </div>

                <DeleteDataView
                  setShowConfirmAlert={setShowConfirmAlert}
                  setLoadingDeletionElections={setLoadingDeletionElections}
                  setElectionsForDeletion={setElectionsForDeletion}
                  setSelectedElectionForDeletion={setSelectedElectionForDeletion}
                  loadingDeletionElections={loadingDeletionElections}
                  electionsForDeletion={electionsForDeletion}
                  selectedElectionForDeletion={selectedElectionForDeletion}
                  fetchElections={fetchElectionsForDeletion}
                />

                {showConfirmAlert && (
                  <Alert
                    message={'Daten unwideruflich löschen'}
                    setShowAlert={setShowConfirmAlert}
                    onConfirm={handleDeleteAllData}
                  />
                )}
              </div>
            )}

            {/* NEU ANFANG (templates) */}
            {activeSection === 'config' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-yellow-500">
                <div className="border-b px-6 py-4">
                  <h2 className="text-xl font-bold">⚙️ Wahl-Parameter Konfiguration</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Lade neue JSON-Presets hoch, um die Vorlagen zu erweitern.
                  </p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex gap-4">
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => setSelectedConfigFile(e.target.files[0])}
                      className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-yellow-50 file:text-yellow-700"
                    />
                    <button
                      onClick={handleUploadConfig}
                      disabled={!selectedConfigFile}
                      className={`px-6 py-2 rounded font-bold text-white ${!selectedConfigFile ? 'bg-gray-300' : 'bg-yellow-600 hover:bg-yellow-700'}`}
                    >
                      Hochladen
                    </button>
                  </div>
                  {uploadStatus && (
                    <div
                      className={`p-4 rounded-lg text-sm font-bold ${uploadStatus.includes('Erfolg') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
                    >
                      {uploadStatus}
                    </div>
                  )}

                  <div className="border-t pt-6 mt-6">
                    <h3 className="font-bold mb-3">
                      💡 JSON-Template für benutzerdefinierte Presets
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Sie können neue Wahl-Konfigurationen als JSON-Dateien erstellen. Laden Sie
                      diese Vorlage herunter, um zu sehen, wie das Format aussehen muss:
                    </p>
                    <a
                      href="/data/election_presets_template.json"
                      download="election_presets_template.json"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                    >
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
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      JSON-Template herunterladen
                    </a>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'template' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-xl font-bold text-gray-900">Vorlage herunterladen</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Laden Sie Vorlagen für Wahl-Konfigurationen und Wählerverzeichnisse herunter
                  </p>
                </div>

                <div className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Blanko-Vorlage Card */}
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-shadow">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white border-2 border-gray-200 mb-4">
                        <svg
                          className="w-8 h-8 text-gray-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Blanko-Vorlage</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Leere Vorlage zum manuellen Ausfüllen
                      </p>
                      <a
                        href="/templates/ElectionInfoTemplate.xlsx"
                        download="ElectionInfoTemplate.xlsx"
                        className="inline-block"
                      >
                        <button
                          style={{ backgroundColor: theme.colors.primary }}
                          className="px-5 py-2.5 text-white text-sm font-medium rounded-md hover:opacity-90 transition-opacity flex items-center gap-2 mx-auto"
                        >
                          <svg
                            className="w-4 h-4"
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
                          Download (.xlsx)
                        </button>
                      </a>
                    </div>

                    {/* Vorgefertigte Vorlagen Card */}
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="text-center mb-4">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white border-2 border-gray-200 mb-4">
                          <svg
                            className="w-8 h-8 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                            />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Vorgefertigte Vorlagen
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                          Vorkonfigurierte Vorlagen für verschiedene Wahltypen
                        </p>
                      </div>
                      <select
                        value={templateType}
                        onChange={(e) => setTemplateType(e.target.value)}
                        className="w-full rounded-md border-gray-300 mb-4 p-2.5 bg-white border text-sm"
                      >
                        <option value="generic">📝 Leere Wahl-Vorlage (Standard)</option>
                        {presetOptions && presetOptions.internal && (
                          <optgroup label="HKA Standard-Presets">
                            {presetOptions.internal
                              .filter((p) => p.key !== 'generic')
                              .map((p) => (
                                <option key={p.key} value={p.key}>
                                  🏛️ {p.info}
                                </option>
                              ))}
                          </optgroup>
                        )}
                        {presetOptions &&
                          presetOptions.external &&
                          presetOptions.external.length > 0 && (
                            <optgroup label="Benutzerdefinierte Presets">
                              {presetOptions.external.map((p) => (
                                <option key={p.key} value={p.key}>
                                  ⚙️ {p.info}
                                </option>
                              ))}
                            </optgroup>
                          )}
                      </select>
                      {/* Format-Auswahl */}
                      <div className="flex items-center justify-center gap-3 mb-4">
                        <span className="text-sm text-gray-600">Format:</span>
                        <label className="flex items-center gap-1 text-sm cursor-pointer">
                          <input
                            type="radio"
                            name="templateFormat"
                            value="ods"
                            checked={templateFormat === 'ods'}
                            onChange={() => setTemplateFormat('ods')}
                          />
                          ODS (OpenDocument)
                        </label>
                        <label className="flex items-center gap-1 text-sm cursor-pointer">
                          <input
                            type="radio"
                            name="templateFormat"
                            value="xlsx"
                            checked={templateFormat === 'xlsx'}
                            onChange={() => setTemplateFormat('xlsx')}
                          />
                          XLSX (Microsoft Excel)
                        </label>
                      </div>
                      <div className="text-center">
                        <ResponsiveButton
                          onClick={handleDownloadTemplate}
                          variant="primary"
                          size="medium"
                        >
                          Vorlage laden
                        </ResponsiveButton>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Vorlage erstellen Section */}
            {activeSection === 'templateBuilder' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-xl font-bold text-gray-900">Vorlage erstellen</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Wahlzeitraum und Wahlen direkt eingeben — die Vorlage wird konsistent und sofort importierbar erstellt.
                  </p>
                </div>
                <div className="p-6">
                  <ElectionTemplateBuilder />
                </div>
              </div>
            )}

            {/* Wahleinstellung hochladen Section */}
            {activeSection === 'definition' && (
              <FileUploadSection
                key="upload-elections"
                title="Wahleinstellung hochladen"
                description="Laden Sie eine Tabellendatei (.ods, .xlsx) mit der Wahlkonfiguration hoch. Die Datei wird automatisch validiert."
                uploadType="elections"
                endpoint="/upload/elections"
                validator={validateElectionExcel}
                acceptedFileTypes=".ods,.xlsx,.xls"
                formatExample="Siehe Vorlage (Download über Menü)"
                fileTypeLabel="Tabelle"
              />
            )}

            {/* Wahlen exportieren Section */}
            {activeSection === 'exportElections' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-xl font-bold text-gray-900">Wahlen exportieren</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Exportiert alle aktuell in der Datenbank gespeicherten Wahlen als ausgefüllte
                    Tabellendatei — kompatibel mit dem Import-Format.
                  </p>
                </div>
                <div className="p-6 flex flex-col items-center gap-6">
                  <div className="flex items-center gap-6">
                    <ResponsiveButton
                      onClick={() => handleExportElections('ods')}
                      variant="primary"
                      size="medium"
                    >
                      Als ODS exportieren
                    </ResponsiveButton>
                    <ResponsiveButton
                      onClick={() => handleExportElections('xlsx')}
                      variant="outline"
                      size="medium"
                    >
                      Als XLSX exportieren
                    </ResponsiveButton>
                  </div>
                  <p className="text-xs text-gray-400">
                    Die exportierte Datei kann direkt wieder importiert werden (Abschnitt 3.3).
                  </p>
                </div>
              </div>
            )}

            {/* Wählerverzeichnisse hochladen Section */}
            {activeSection === 'upload' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-xl font-bold text-gray-900">Wählerverzeichnisse hochladen</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Für jede Wahl ohne Wählerverzeichnis eine CSV-Datei auswählen und anschließend en-bloc hochladen.
                    Format: <code className="text-xs bg-gray-100 px-1 rounded">RZ-Kennung,Fakultät,Vorname,Nachname,Matr.Nr</code>
                  </p>
                </div>
                <div className="p-6">
                  <VoterUploadMulti />
                </div>
              </div>
            )}

            {/* Wählerverzeichnis herunterladen Section */}
            {activeSection === 'download' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    Wählerverzeichnis herunterladen
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Aktuelles Wählerverzeichnis als Tabellendokument herunterladen (enthält ein
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
                    Aktuelles Kandidatenverzeichnis als Tabellendokument herunterladen (enthält ein
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

            {/* Integrity Check Section */}
            {activeSection === 'integrity' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b px-6 py-4">
                  <h2 className="text-xl font-bold">🔒 Daten-Integritätsprüfung</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Überprüfen Sie die Integrität der Wahldaten durch Blockchain-ähnliche
                    Hash-Validierung
                  </p>
                </div>
                <div className="p-6">
                  <IntegrityCheckView />
                </div>
              </div>
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
