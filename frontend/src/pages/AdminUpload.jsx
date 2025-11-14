import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../hooks/useTheme.js';
import ResponsiveButton from '../components/ResponsiveButton.jsx';

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

  // Redirect non-admins
  if (user?.role !== 'admin') {
    navigate('/home');
    return null;
  }

  /**
   * Validate file type and size.
   *
   * @param {File} file - File to validate
   * @returns {boolean} True if file is valid
   */
  const validateFile = (file) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      setError('Bitte laden Sie eine Excel-Datei hoch (.xlsx oder .xls)');
      return false;
    }

    if (file.size > maxSize) {
      setError('Die Datei ist zu groß. Maximale Größe: 10MB');
      return false;
    }

    return true;
  };

  /**
   * Handle file selection from input or drag & drop.
   *
   * @param {File} file - Selected file
   */
  const handleFileSelect = (file) => {
    setError('');
    setSuccess('');

    if (validateFile(file)) {
      setSelectedFile(file);
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
   * Simulates upload progress and backend communication.
   */
  const handleUpload = async () => {
    if (!selectedFile) {
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

      // Simulate backend call
      await new Promise((resolve) => {
        return setTimeout(resolve, 2000);
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      setSuccess('Excel-Datei erfolgreich hochgeladen und verarbeitet!');
      setTimeout(() => {
        setSelectedFile(null);
        setUploadProgress(0);
        navigate('/home'); // Redirect to home to see the new election
      }, 2000);
    } catch {
      setError('Fehler beim Hochladen der Datei. Bitte versuchen Sie es erneut.');
    } finally {
      setUploading(false);
    }
  };

  /**
   * Reset file selection.
   */
  const handleReset = () => {
    setSelectedFile(null);
    setError('');
    setSuccess('');
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-brand-primary text-white shadow-lg">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">
                {theme.institution.name} {theme.text.appTitle}
              </h1>
              <p className="text-sm opacity-90">
                {user?.username} · {theme.roles[user?.role]}
              </p>
            </div>
            <div className="flex gap-2">
              <ResponsiveButton variant="outline" size="small" onClick={() => navigate('/home')}>
                Zurück
              </ResponsiveButton>
              <ResponsiveButton variant="secondary" size="small" onClick={logout}>
                Abmelden
              </ResponsiveButton>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Title */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Wahl hochladen</h2>
            <p className="text-gray-600">Excel-Datei mit Wahldefinitionen importieren</p>
          </div>

          {/* Requirements */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
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
                <p className="font-medium mb-2">Anforderungen:</p>
                <ul className="space-y-1 text-blue-800">
                  <li>• Format: .xlsx oder .xls (max. 10 MB)</li>
                  <li>• Pflichtfelder: Kennung, Listen, Plätze, Fakultät, Studiengänge</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Upload Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Drag & Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={!selectedFile ? handleBrowseClick : undefined}
              className={`
                p-12 border-2 border-dashed transition-all cursor-pointer
                ${isDragging ? 'border-brand-primary bg-red-50' : selectedFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-brand-primary hover:bg-gray-50'}
              `}
            >
              {!selectedFile ? (
                <div className="text-center">
                  <div
                    className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 transition-colors ${isDragging ? 'bg-brand-primary' : 'bg-gray-100'}`}
                  >
                    <svg
                      className={`w-8 h-8 ${isDragging ? 'text-white' : 'text-gray-500'}`}
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
                  <p className="text-lg font-medium text-gray-900 mb-1">
                    {isDragging ? 'Datei hier ablegen' : 'Datei ablegen oder klicken'}
                  </p>
                  <p className="text-sm text-gray-500">Excel-Dateien (.xlsx, .xls)</p>
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
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p className="font-medium text-green-900 mb-1">Datei ausgewählt</p>
                  <p className="text-sm text-gray-600 truncate max-w-md mx-auto">
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

            {/* Progress Bar */}
            {uploading && uploadProgress > 0 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-gray-700">Upload-Fortschritt</span>
                  <span className="text-brand-primary font-medium">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-brand-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Messages */}
            {error && (
              <div className="mx-6 my-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex gap-3">
                <svg
                  className="w-5 h-5 text-red-500 flex-shrink-0"
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
                  <p className="font-medium">Fehler</p>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="mx-6 my-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex gap-3">
                <svg
                  className="w-5 h-5 text-green-500 flex-shrink-0"
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
                  <p className="font-medium">Erfolg</p>
                  <p>{success}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="p-6 bg-gray-50 border-t border-gray-200">
              {selectedFile ? (
                <div className="flex gap-3">
                  <ResponsiveButton
                    variant="primary"
                    size="large"
                    fullWidth
                    onClick={handleUpload}
                    disabled={uploading}
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
                    ) : (
                      <div className="flex items-center justify-center gap-2">
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
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                          />
                        </svg>
                        <span>Hochladen</span>
                      </div>
                    )}
                  </ResponsiveButton>
                  <ResponsiveButton
                    variant="outline"
                    size="large"
                    onClick={handleReset}
                    disabled={uploading}
                  >
                    Abbrechen
                  </ResponsiveButton>
                </div>
              ) : (
                <ResponsiveButton
                  variant="primary"
                  size="large"
                  fullWidth
                  onClick={handleBrowseClick}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span>Datei auswählen</span>
                  </div>
                </ResponsiveButton>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-brand-dark text-white py-4 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm">
          <p className="opacity-90">{theme.text.copyright}</p>
        </div>
      </footer>
    </div>
  );
};

export default AdminUpload;
