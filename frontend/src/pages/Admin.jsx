import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../hooks/useTheme.js';
import ResponsiveButton from '../components/ResponsiveButton.jsx';
import ValidationErrors from '../components/ValidationErrors.jsx';
import { validateVoterCSV } from '../utils/validators/csvValidator.js';
import { validateElectionExcel } from '../utils/validators/excelValidator.js';
import { MAX_FILE_SIZE } from '../utils/validators/constants.js';

/**
 * Admin page for uploading election definitions via Excel file.
 * Features drag & drop and file browser with validation.
 * Only accessible to users with admin role.
 *
 * @returns Excel upload interface with visual feedback and instructions
 */
const AdminUpload = () => {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSection, setActiveSection] = useState('upload'); // 'upload' | 'manage' | 'export'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [validationStats, setValidationStats] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  // Redirect non-admins
  if (user?.role !== 'admin') {
    navigate('/home');
    return null;
  }

  /**
   * Validate file type and size.
   *
   * @param {File} file - File to validate
   * @param {string} fileType - Expected file type ('csv' or 'excel')
   * @returns {boolean} True if file is valid
   */
  const validateFile = (file, fileType) => {
    const csvTypes = ['text/csv'];
    const excelTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];

    if (fileType === 'csv') {
      if (!csvTypes.includes(file.type) && !file.name.endsWith('.csv')) {
        setError('Bitte laden Sie eine CSV-Datei hoch (.csv)');
        return false;
      }
    } else if (fileType === 'excel') {
      if (
        !excelTypes.includes(file.type) &&
        !file.name.endsWith('.xlsx') &&
        !file.name.endsWith('.xls')
      ) {
        setError('Bitte laden Sie eine Excel-Datei hoch (.xlsx oder .xls)');
        return false;
      }
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('Die Datei ist zu groß. Maximale Größe: 10MB');
      return false;
    }

    return true;
  };

  /**
   * Handle file selection from input or drag & drop.
   * Performs immediate validation using Zod.
   *
   * @param {File} file - Selected file
   */
  const handleFileSelect = async (file) => {
    setError('');
    setSuccess('');
    setValidationErrors([]);
    setValidationStats(null);

    // Determine file type based on file extension
    const fileType = file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'excel';

    if (!validateFile(file, fileType)) {
      return;
    }

    setIsValidating(true);

    try {
      let validationResult;

      if (fileType === 'csv') {
        validationResult = await validateVoterCSV(file);
      } else {
        validationResult = await validateElectionExcel(file);
      }

      if (!validationResult.success) {
        setValidationErrors(validationResult.errors);
        setSelectedFile(null); // Don't set file if validation fails
        setError(
          'Die Datei enthält Validierungsfehler. Bitte korrigieren Sie diese und versuchen Sie es erneut.',
        );
      } else {
        setSelectedFile(file); // Only set file if validation succeeds
        setValidationStats(validationResult.stats);
        setSuccess('Datei erfolgreich validiert! Sie können nun hochladen.');
      }
    } catch (validationError) {
      setSelectedFile(null); // Don't set file on validation error
      setError(`Validierungsfehler: ${validationError.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  /**
   * Handle drag over event.
   *
   * @param {React.DragEvent} e - Drag event
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  /**
   * Handle drag leave event.
   */
  const handleDragLeave = () => {
    setIsDragging(false);
  };

  /**
   * Handle file drop event.
   *
   * @param {React.DragEvent} e - Drop event
   */
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  /**
   * Handle browse button click.
   */
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * Handle file input change.
   *
   * @param {React.ChangeEvent<HTMLInputElement>} e - Input change event
   */
  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  /**
   * Handle file upload to backend.
   * Only proceeds if file passed validation.
   */
  const handleUpload = async () => {
    if (!selectedFile) {
      return;
    }

    // Prevent upload if validation errors exist
    if (validationErrors.length > 0) {
      setError('Bitte korrigieren Sie zuerst die Validierungsfehler.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // TODO: Replace with actual backend API call
      // Example:
      // const formData = new FormData();
      // formData.append('file', selectedFile);
      // const response = await api.post('/upload/voters', formData);

      // Simulate backend call
      await new Promise((resolve) => {
        return setTimeout(resolve, 2000);
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      setSuccess('Datei erfolgreich hochgeladen und verarbeitet!');
      setTimeout(() => {
        setSelectedFile(null);
        setUploadProgress(0);
        setValidationErrors([]);
        setValidationStats(null);
        navigate('/home'); // Redirect to home to see the new data
      }, 2000);
    } catch {
      setError('Fehler beim Hochladen der Datei. Bitte versuchen Sie es erneut.');
    } finally {
      setUploading(false);
    }
  };

  /**
   * Reset file selection and validation state.
   */
  const handleReset = () => {
    setSelectedFile(null);
    setError('');
    setSuccess('');
    setUploadProgress(0);
    setValidationErrors([]);
    setValidationStats(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Bar */}
          <div className="flex items-center justify-between py-5">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-gray-700 hover:text-gray-900"
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
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                  Verwaltungsbereich
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  {user?.username} · {theme.roles[user?.role]}
                </p>
              </div>
            </div>
            <div>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
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
                <div className="mb-6">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Verwaltung
                  </div>
                  <button
                    onClick={() => {
                      setActiveSection('clear');
                      setMobileMenuOpen(false);
                      handleReset();
                    }}
                    style={{
                      backgroundColor:
                        activeSection === 'clear' ? theme.colors.primary : 'transparent',
                      color: activeSection === 'clear' ? '#ffffff' : theme.colors.dark,
                    }}
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
                    Wählerverzeichnis
                  </div>
                  <button
                    onClick={() => {
                      setActiveSection('upload');
                      setMobileMenuOpen(false);
                      handleReset();
                    }}
                    style={{
                      backgroundColor:
                        activeSection === 'upload' ? theme.colors.primary : 'transparent',
                      color: activeSection === 'upload' ? '#ffffff' : theme.colors.dark,
                    }}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span>CSV-Datei hochladen</span>
                      <span className="text-xs opacity-60">2.1</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setActiveSection('download');
                      setMobileMenuOpen(false);
                      handleReset();
                    }}
                    style={{
                      backgroundColor:
                        activeSection === 'download' ? theme.colors.primary : 'transparent',
                      color: activeSection === 'download' ? '#ffffff' : theme.colors.dark,
                    }}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span>Wählerverzeichnis herunterladen</span>
                      <span className="text-xs opacity-60">2.2</span>
                    </div>
                  </button>
                </div>

                <div className="mb-6">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Wahlen definieren
                  </div>
                  <button
                    onClick={() => {
                      setActiveSection('template');
                      setMobileMenuOpen(false);
                      handleReset();
                    }}
                    style={{
                      backgroundColor:
                        activeSection === 'template' ? theme.colors.primary : 'transparent',
                      color: activeSection === 'template' ? '#ffffff' : theme.colors.dark,
                    }}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span>Excel-Vorlage herunterladen</span>
                      <span className="text-xs opacity-60">3.1</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setActiveSection('definition');
                      setMobileMenuOpen(false);
                      handleReset();
                    }}
                    style={{
                      backgroundColor:
                        activeSection === 'definition' ? theme.colors.primary : 'transparent',
                      color: activeSection === 'definition' ? '#ffffff' : theme.colors.dark,
                    }}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span>Wahleinstellung hochladen</span>
                      <span className="text-xs opacity-60">3.2</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setActiveSection('load');
                      setMobileMenuOpen(false);
                      handleReset();
                    }}
                    style={{
                      backgroundColor:
                        activeSection === 'load' ? theme.colors.primary : 'transparent',
                      color: activeSection === 'load' ? '#ffffff' : theme.colors.dark,
                    }}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span>Einstellungen laden</span>
                      <span className="text-xs opacity-60">3.3</span>
                    </div>
                  </button>
                </div>

                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Export
                  </div>
                  <button
                    onClick={() => {
                      setActiveSection('export');
                      setMobileMenuOpen(false);
                      handleReset();
                    }}
                    style={{
                      backgroundColor:
                        activeSection === 'export' ? theme.colors.primary : 'transparent',
                      color: activeSection === 'export' ? '#ffffff' : theme.colors.dark,
                    }}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span>Wahldaten exportieren</span>
                      <span className="text-xs opacity-60">4</span>
                    </div>
                  </button>
                </div>
              </nav>
            </div>
          </aside>

          {/* Right Content Area */}
          <div className="flex-1 w-full lg:w-auto">
            {/* Upload Section */}
            {activeSection === 'upload' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-xl font-bold text-gray-900">Wählerverzeichnis hochladen</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    CSV-Datei mit den Wählern hochladen. Die Datei muss aus einer Kopfzeile und den
                    folgenden, durch Komma getrennten Spalten bestehen:
                  </p>
                </div>

                <div className="p-6">
                  {/* Format Example */}
                  <div className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-xs font-mono text-gray-700 mb-2">Format-Beispiel:</p>
                    <code className="text-xs font-mono text-gray-900 block bg-white p-3 rounded border border-gray-300 overflow-x-auto">
                      RZ-Kennung,Fakultät,Vorname,Nachname,Matk.Nr,Studienganskürzel,Studiengang
                      <br />
                      abcd1234,AB,Max,Mustermann,123456,ARTB,Architektur
                    </code>
                  </div>

                  {/* Drag & Drop Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={!selectedFile ? handleBrowseClick : undefined}
                    className={`
                      relative p-12 border-2 border-dashed rounded-lg transition-all cursor-pointer
                      ${isDragging ? 'border-brand-primary bg-blue-50 scale-[1.02]' : selectedFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-brand-primary hover:bg-gray-50'}
                    `}
                  >
                    {!selectedFile ? (
                      <div className="text-center">
                        <div
                          className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 transition-all ${isDragging ? 'bg-brand-primary scale-110' : 'bg-gray-100'}`}
                        >
                          <svg
                            className={`w-8 h-8 ${isDragging ? 'text-white' : 'text-gray-400'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                        </div>
                        <p className="text-lg font-semibold text-gray-900 mb-2">
                          {isDragging ? 'Datei hier ablegen...' : 'Datei hier ziehen oder klicken'}
                        </p>
                        <p className="text-sm text-gray-500 mb-4">CSV-Datei (max. 10 MB)</p>
                        <ResponsiveButton variant="outline" size="medium">
                          Datei auswählen
                        </ResponsiveButton>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500 mb-4">
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
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                        <p className="font-semibold text-green-900 mb-2">Datei bereit zum Upload</p>
                        <p className="text-sm text-gray-700 font-medium truncate max-w-md mx-auto">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </div>

                  {/* Validation in Progress */}
                  {isValidating && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-3">
                        <svg
                          className="animate-spin h-5 w-5 text-blue-600"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <span className="text-sm font-medium text-blue-900">
                          Datei wird validiert...
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Validation Stats */}
                  {validationStats && validationErrors.length === 0 && (
                    <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="text-sm font-bold text-green-900 mb-3">
                        ✓ Validierung erfolgreich
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {validationStats.totalVoters !== undefined && (
                          <div>
                            <span className="text-green-700 font-medium">Wähler:</span>
                            <span className="ml-2 text-green-900 font-bold">
                              {validationStats.totalVoters}
                            </span>
                          </div>
                        )}
                        {validationStats.faculties !== undefined && (
                          <div>
                            <span className="text-green-700 font-medium">Fakultäten:</span>
                            <span className="ml-2 text-green-900 font-bold">
                              {validationStats.faculties}
                            </span>
                          </div>
                        )}
                        {validationStats.voterGroups !== undefined && (
                          <div>
                            <span className="text-green-700 font-medium">Studiengänge:</span>
                            <span className="ml-2 text-green-900 font-bold">
                              {validationStats.voterGroups}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Validation Errors */}
                  {validationErrors.length > 0 && (
                    <ValidationErrors errors={validationErrors} fileType="CSV" />
                  )}

                  {/* Progress Bar */}
                  {uploading && uploadProgress > 0 && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium text-gray-700">Upload läuft...</span>
                        <span className="text-brand-primary font-bold">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-brand-primary h-3 rounded-full transition-all duration-500 relative overflow-hidden"
                          style={{ width: `${uploadProgress}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  {error && (
                    <div className="mt-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex gap-3">
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
                      <div className="text-sm">
                        <p className="font-semibold">Fehler beim Upload</p>
                        <p className="mt-1">{error}</p>
                      </div>
                    </div>
                  )}

                  {success && (
                    <div className="mt-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex gap-3">
                      <svg
                        className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div className="text-sm">
                        <p className="font-semibold">Upload erfolgreich</p>
                        <p className="mt-1">{success}</p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-6 flex gap-3">
                    {selectedFile ? (
                      <>
                        <ResponsiveButton
                          variant="primary"
                          size="large"
                          onClick={handleUpload}
                          disabled={uploading || isValidating || validationErrors.length > 0}
                          className="flex-1"
                        >
                          {uploading ? (
                            <div className="flex items-center justify-center gap-2">
                              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                              <span>Wird hochgeladen...</span>
                            </div>
                          ) : validationErrors.length > 0 ? (
                            'Fehler beheben'
                          ) : (
                            'Hochladen'
                          )}
                        </ResponsiveButton>
                        <ResponsiveButton
                          variant="outline"
                          size="large"
                          onClick={handleReset}
                          disabled={uploading || isValidating}
                        >
                          Abbrechen
                        </ResponsiveButton>
                      </>
                    ) : (
                      <ResponsiveButton
                        variant="primary"
                        size="large"
                        onClick={handleBrowseClick}
                        className="flex-1"
                      >
                        Datei auswählen
                      </ResponsiveButton>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Wahleinstellung hochladen Section */}
            {activeSection === 'definition' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-xl font-bold text-gray-900">Wahleinstellung hochladen</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Hochladen eines Excel-Dokuments mit einer Wahleinstellung. Die Datei muss das
                    gleiche Format wie die Vorlage haben.
                  </p>
                </div>

                <div className="p-6">
                  {/* Drag & Drop Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={!selectedFile ? handleBrowseClick : undefined}
                    className={`
                      relative p-12 border-2 border-dashed rounded-lg transition-all cursor-pointer
                      ${isDragging ? 'border-brand-primary bg-blue-50 scale-[1.02]' : selectedFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-brand-primary hover:bg-gray-50'}
                    `}
                  >
                    {!selectedFile ? (
                      <div className="text-center">
                        <div
                          className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 transition-all ${isDragging ? 'bg-brand-primary scale-110' : 'bg-gray-100'}`}
                        >
                          <svg
                            className={`w-8 h-8 ${isDragging ? 'text-white' : 'text-gray-400'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                        </div>
                        <p className="text-lg font-semibold text-gray-900 mb-2">
                          {isDragging ? 'Datei hier ablegen...' : 'Datei hier ziehen oder klicken'}
                        </p>
                        <p className="text-sm text-gray-500 mb-4">
                          Excel-Dateien (.xlsx, .xls) max. 10 MB
                        </p>
                        <ResponsiveButton variant="outline" size="medium">
                          Datei auswählen
                        </ResponsiveButton>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500 mb-4">
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
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                        <p className="font-semibold text-green-900 mb-2">Datei bereit zum Upload</p>
                        <p className="text-sm text-gray-700 font-medium truncate max-w-md mx-auto">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </div>

                  {/* Validation in Progress */}
                  {isValidating && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-3">
                        <svg
                          className="animate-spin h-5 w-5 text-blue-600"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <span className="text-sm font-medium text-blue-900">
                          Datei wird validiert...
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Validation Stats for Excel */}
                  {validationStats && validationErrors.length === 0 && (
                    <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="text-sm font-bold text-green-900 mb-3">
                        ✓ Validierung erfolgreich
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {validationStats.electionName && (
                          <div className="col-span-2">
                            <span className="text-green-700 font-medium">Wahlbezeichnung:</span>
                            <span className="ml-2 text-green-900 font-bold">
                              {validationStats.electionName}
                            </span>
                          </div>
                        )}
                        {validationStats.totalCandidates !== undefined && (
                          <div>
                            <span className="text-green-700 font-medium">Kandidaten:</span>
                            <span className="ml-2 text-green-900 font-bold">
                              {validationStats.totalCandidates}
                            </span>
                          </div>
                        )}
                        {validationStats.votesPerBallot !== undefined && (
                          <div>
                            <span className="text-green-700 font-medium">Stimmen/Wahlzettel:</span>
                            <span className="ml-2 text-green-900 font-bold">
                              {validationStats.votesPerBallot}
                            </span>
                          </div>
                        )}
                        {validationStats.startDate && (
                          <div>
                            <span className="text-green-700 font-medium">Startdatum:</span>
                            <span className="ml-2 text-green-900 font-bold">
                              {validationStats.startDate}
                            </span>
                          </div>
                        )}
                        {validationStats.endDate && (
                          <div>
                            <span className="text-green-700 font-medium">Enddatum:</span>
                            <span className="ml-2 text-green-900 font-bold">
                              {validationStats.endDate}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Validation Errors for Excel */}
                  {validationErrors.length > 0 && (
                    <ValidationErrors errors={validationErrors} fileType="Excel" />
                  )}

                  {/* Progress Bar */}
                  {uploading && uploadProgress > 0 && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium text-gray-700">Upload läuft...</span>
                        <span className="text-brand-primary font-bold">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-brand-primary h-3 rounded-full transition-all duration-500 relative overflow-hidden"
                          style={{ width: `${uploadProgress}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  {error && (
                    <div className="mt-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex gap-3">
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
                      <div className="text-sm">
                        <p className="font-semibold">Fehler beim Upload</p>
                        <p className="mt-1">{error}</p>
                      </div>
                    </div>
                  )}

                  {success && (
                    <div className="mt-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex gap-3">
                      <svg
                        className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div className="text-sm">
                        <p className="font-semibold">Upload erfolgreich</p>
                        <p className="mt-1">{success}</p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-6 flex gap-3">
                    {selectedFile ? (
                      <>
                        <ResponsiveButton
                          variant="primary"
                          size="large"
                          onClick={handleUpload}
                          disabled={uploading || isValidating || validationErrors.length > 0}
                          className="flex-1"
                        >
                          {uploading ? (
                            <div className="flex items-center justify-center gap-2">
                              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                              <span>Wird hochgeladen...</span>
                            </div>
                          ) : validationErrors.length > 0 ? (
                            'Fehler beheben'
                          ) : (
                            'Hochladen'
                          )}
                        </ResponsiveButton>
                        <ResponsiveButton
                          variant="outline"
                          size="large"
                          onClick={handleReset}
                          disabled={uploading || isValidating}
                        >
                          Abbrechen
                        </ResponsiveButton>
                      </>
                    ) : (
                      <ResponsiveButton
                        variant="primary"
                        size="large"
                        onClick={handleBrowseClick}
                        className="flex-1"
                      >
                        Datei auswählen
                      </ResponsiveButton>
                    )}
                  </div>

                  {/* Info Note */}
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex gap-3">
                      <svg
                        className="w-5 h-5 text-blue-600 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="text-sm text-blue-900">
                        <p className="font-semibold mb-1">Anmerkung:</p>
                        <p className="text-blue-800">
                          Die Datei wird auf Fehler geprüft. Wenn es Fehler gibt, wird die Datei
                          nicht hochgeladen und Sie werden über die Fehler informiert.
                        </p>
                      </div>
                    </div>
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
                    <ResponsiveButton variant="outline" size="medium">
                      Bald verfügbar
                    </ResponsiveButton>
                  </div>
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
                    <ResponsiveButton variant="outline" size="medium">
                      Bald verfügbar
                    </ResponsiveButton>
                  </div>
                </div>
              </div>
            )}

            {/* Einstellungen laden Section */}
            {activeSection === 'load' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-xl font-bold text-gray-900">Einstellungen laden</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Herunterladen der aktuellen Wahleinstellungen als Excel-Dokument
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
                    <ResponsiveButton variant="outline" size="medium">
                      Bald verfügbar
                    </ResponsiveButton>
                  </div>
                </div>
              </div>
            )}

            {/* Wahldaten exportieren Section */}
            {activeSection === 'export' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-xl font-bold text-gray-900">Wahldaten exportieren</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Exportdatei mit allen Wahldaten erstellen, die für spätere für Untersuchungen
                    verwendet werden kann.
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
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <p className="text-gray-600 mb-6">
                      Diese Funktion wird demnächst verfügbar sein.
                    </p>
                    <ResponsiveButton variant="outline" size="medium">
                      Bald verfügbar
                    </ResponsiveButton>
                  </div>
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

      {/* CSS for shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default AdminUpload;
