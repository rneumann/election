import { useState, useRef } from "react";
import ResponsiveButton from "../ResponsiveButton.jsx";
import ValidationErrors from "../ValidationErrors.jsx";
import api from "../../services/api.js";
import { logger } from "../../conf/logger/logger.js";
import { MAX_FILE_SIZE } from "../../utils/validators/constants.js";

/**
 * FileUploadSection - Reusable file upload component with validation
 *
 * Features:
 * - Drag & drop file upload
 * - File browser alternative
 * - Client-side validation
 * - Progress tracking
 * - Success/error messaging
 *
 * @param {Object} props - Component props
 * @param {string} props.title - Section title
 * @param {string} props.description - Section description
 * @param {string} props.uploadType - Upload type identifier ('voters', 'candidates', 'elections')
 * @param {string} props.endpoint - API endpoint for upload
 * @param {Function} props.validator - Validation function (async)
 * @param {Function} [props.transformer] - File transformation function (optional)
 * @param {string} props.acceptedFileTypes - Accepted file extensions (e.g., '.csv')
 * @param {string} props.formatExample - Example format text (header row)
 * @param {string} [props.formatExampleData] - Example data row (optional)
 * @param {string} props.fileTypeLabel - Label for file type ('CSV' or 'Excel')
 * @returns {JSX.Element} File upload interface
 */
const FileUploadSection = ({
  title,
  description,
  uploadType,
  endpoint,
  validator,
  transformer,
  acceptedFileTypes,
  formatExample,
  formatExampleData,
  fileTypeLabel = "CSV",
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [validationErrors, setValidationErrors] = useState([]);
  const [validationStats, setValidationStats] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const fileInputRef = useRef(null);

  /**
   * Validate file type and size
   *
   * @param {File} file - File to validate
   * @returns {boolean} True if valid
   */
  const validateFile = (file) => {
    const ext = file.name.toLowerCase();
    const accepted = acceptedFileTypes.split(",").map((t) => t.trim());

    if (!accepted.some((type) => ext.endsWith(type))) {
      setError(`Bitte laden Sie eine ${accepted.join(" oder ")} Datei hoch.`);
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Die Datei ist zu groß. Maximale Größe: 10MB");
      return false;
    }

    return true;
  };

  /**
   * Handle file selection and validation
   *
   * @param {File} file - Selected file
   */
  const handleFileSelect = async (file) => {
    setError("");
    setSuccess("");
    setValidationErrors([]);
    setValidationStats(null);

    if (!validateFile(file)) {
      return;
    }

    setIsValidating(true);

    try {
      const validationResult = await validator(file);

      if (!validationResult.success) {
        setValidationErrors(validationResult.errors);
        setSelectedFile(null);
        setError("Die Datei enthält Validierungsfehler.");
      } else {
        setSelectedFile(file);
        setValidationStats(validationResult.stats);
        setSuccess("Datei erfolgreich validiert! Sie können nun hochladen.");
      }
    } catch (err) {
      logger.error(`Error validating file: ${err.message}`);
      setError(`Fehler bei der Validierung: ${err.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  /**
   * Handle file upload
   */
  const handleUpload = async () => {
    if (!selectedFile) {
      return;
    }

    if (validationErrors.length > 0) {
      setError("Bitte korrigieren Sie zuerst die Validierungsfehler.");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");
    setUploadProgress(0);

    try {
      let fileToUpload = selectedFile;

      // Apply transformation if provided
      if (transformer) {
        fileToUpload = await transformer(selectedFile);
      }

      const formData = new FormData();
      formData.append("file", fileToUpload);

      const csrfToken = localStorage.getItem("csrfToken") || "";

      const response = await api.post(endpoint, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "X-CSRF-Token": csrfToken,
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
      });

      if (response.status === 200) {
        setSuccess(response.data.message || "Datei erfolgreich hochgeladen!");
        setSelectedFile(null);
        setValidationStats(null);
        setUploadProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        setError(response.data.message || "Upload fehlgeschlagen.");
      }
    } catch (err) {
      logger.error(`Error uploading file: ${err.message}`);
      setError(`Fehler beim Hochladen: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  /**
   * Handle drag events
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  /**
   * Reset file selection
   */
  const handleClearFile = () => {
    setSelectedFile(null);
    setValidationStats(null);
    setError("");
    setSuccess("");
    setValidationErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>

      <div className="p-6">
        {/* Format Example */}
        <div className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="text-xs font-mono text-gray-700 mb-2">
            Format-Beispiel:
          </p>
          <code className="text-xs font-mono text-gray-900 block bg-white p-3 rounded border border-gray-300 overflow-x-auto">
            {formatExample}
            {formatExampleData && (
              <>
                <br />
                {formatExampleData}
              </>
            )}
          </code>
        </div>

        {/* Drag & Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={
            !selectedFile ? () => fileInputRef.current?.click() : undefined
          }
          className={`
            relative p-12 border-2 border-dashed rounded-lg transition-all cursor-pointer
            ${isDragging ? "border-brand-primary bg-blue-50 scale-[1.02]" : selectedFile ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-brand-primary hover:bg-gray-50"}
          `}
        >
          {!selectedFile ? (
            <div className="text-center">
              <div
                className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 transition-all ${isDragging ? "bg-brand-primary scale-110" : "bg-gray-100"}`}
              >
                <svg
                  className={`w-8 h-8 ${isDragging ? "text-white" : "text-gray-400"}`}
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
              <p className="text-lg font-medium text-gray-900 mb-2">
                Datei hierher ziehen
              </p>
              <p className="text-sm text-gray-500 mb-4">
                oder hier klicken, um eine Datei auszuwählen
              </p>
              <p className="text-xs text-gray-400">
                Unterstützte Formate: {acceptedFileTypes}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptedFileTypes}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
            </div>
          ) : (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500 mb-4">
                <svg
                  className="w-8 h-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <p className="font-semibold text-green-900 mb-2">
                Datei bereit zum Upload
              </p>
              <p className="text-sm text-gray-700 font-medium truncate max-w-md mx-auto">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          )}
        </div>

        {/* Validation State */}
        {isValidating && (
          <div className="flex items-center gap-3 text-blue-600">
            <svg
              className="animate-spin h-5 w-5"
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
            <span className="font-medium">Validiere Datei...</span>
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
                  <span className="text-green-700 font-medium">
                    Fakultäten:
                  </span>
                  <span className="ml-2 text-green-900 font-bold">
                    {validationStats.faculties}
                  </span>
                </div>
              )}
              {validationStats.totalCandidates !== undefined && (
                <div>
                  <span className="text-green-700 font-medium">
                    Kandidaten:
                  </span>
                  <span className="ml-2 text-green-900 font-bold">
                    {validationStats.totalCandidates}
                  </span>
                </div>
              )}
              {validationStats.electionName !== undefined && (
                <div className="col-span-2">
                  <span className="text-green-700 font-medium">
                    Wahlbezeichnung:
                  </span>
                  <span className="ml-2 text-green-900 font-bold">
                    {validationStats.electionName}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-gray-700">Upload läuft...</span>
              <span className="text-brand-primary font-bold">
                {uploadProgress}%
              </span>
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

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex gap-3">
            <svg
              className="w-5 h-5 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <ValidationErrors
            errors={validationErrors}
            fileType={fileTypeLabel}
          />
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex gap-3">
          {selectedFile ? (
            <>
              <ResponsiveButton
                variant="primary"
                size="large"
                onClick={handleUpload}
                disabled={
                  uploading || isValidating || validationErrors.length > 0
                }
                className="flex-1"
              >
                {uploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5"
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
                    <span>Wird hochgeladen...</span>
                  </div>
                ) : validationErrors.length > 0 ? (
                  "Fehler beheben"
                ) : (
                  "Hochladen"
                )}
              </ResponsiveButton>
              <ResponsiveButton
                variant="outline"
                size="large"
                onClick={handleClearFile}
                disabled={uploading || isValidating}
              >
                Abbrechen
              </ResponsiveButton>
            </>
          ) : (
            <ResponsiveButton
              variant="primary"
              size="large"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1"
            >
              Datei auswählen
            </ResponsiveButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUploadSection;
