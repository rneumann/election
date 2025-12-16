import { useTheme } from "../hooks/useTheme.js";

/**
 * Component for displaying validation errors in a structured table format.
 * Used for CSV and Excel file validation feedback.
 *
 * @param {object} props - Component props
 * @param {Array<{row?: number, field?: string, sheet?: string, message: string, code: string}>} props.errors - Validation errors
 * @param {string} props.fileType - Type of file ('CSV' or 'Excel')
 * @returns {React.ReactElement} Validation errors component
 */
const ValidationErrors = ({ errors, fileType = "CSV" }) => {
  const theme = useTheme();

  if (!errors || errors.length === 0) {
    return null;
  }

  const isExcel = fileType === "Excel";

  return (
    <div className="mt-6 bg-red-50 border border-red-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-red-200 bg-red-100">
        <div className="flex items-center gap-3">
          <svg
            className="w-6 h-6 text-red-600 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <h3 className="text-lg font-bold text-red-900">
              Validierungsfehler gefunden
            </h3>
            <p className="text-sm text-red-800 mt-0.5">
              Die Datei konnte nicht hochgeladen werden. Bitte korrigieren Sie
              die folgenden Fehler und versuchen Sie es erneut.
            </p>
          </div>
        </div>
      </div>

      {/* Error count */}
      <div className="px-6 py-3 bg-red-50 border-b border-red-200">
        <p className="text-sm font-semibold text-red-900">
          {errors.length} Fehler {errors.length === 1 ? "gefunden" : "gefunden"}
        </p>
      </div>

      {/* Errors Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-red-100">
            <tr>
              {isExcel && (
                <th className="px-4 py-3 text-left font-semibold text-red-900 border-b border-red-200">
                  Tabellenblatt
                </th>
              )}
              <th className="px-4 py-3 text-left font-semibold text-red-900 border-b border-red-200">
                Zeile
              </th>
              <th className="px-4 py-3 text-left font-semibold text-red-900 border-b border-red-200">
                Spalte
              </th>
              <th className="px-4 py-3 text-left font-semibold text-red-900 border-b border-red-200">
                Fehlermeldung
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-red-200">
            {errors.map((error, index) => (
              <tr key={index} className="hover:bg-red-50 transition-colors">
                {isExcel && (
                  <td className="px-4 py-3 text-gray-900 font-medium">
                    {error.sheet || (
                      <span className="text-gray-400 italic">-</span>
                    )}
                  </td>
                )}
                <td className="px-4 py-3 text-gray-900 font-mono">
                  {error.row ? (
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium"
                      style={{
                        backgroundColor: theme.colors.primary,
                        color: "#ffffff",
                      }}
                    >
                      {error.row}
                    </span>
                  ) : (
                    <span className="text-gray-400 italic">Alle</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-900 font-medium">
                  {error.field ? (
                    <code className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                      {error.field}
                    </code>
                  ) : (
                    <span className="text-gray-400 italic">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-red-900">{error.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Help */}
      <div className="px-6 py-4 bg-red-50 border-t border-red-200">
        <div className="flex gap-3">
          <svg
            className="w-5 h-5 text-red-600 flex-shrink-0"
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
          <div className="text-sm text-red-800">
            <p className="font-semibold mb-1">Tipps zur Fehlerbehebung:</p>
            <ul className="list-disc list-inside space-y-1 text-red-700">
              <li>
                Überprüfen Sie die angegebenen Zeilen und Spalten in Ihrer Datei
              </li>
              <li>
                Stellen Sie sicher, dass alle Pflichtfelder ausgefüllt sind und
                das richtige Format haben
              </li>
              {isExcel ? (
                <li>
                  Prüfen Sie, ob alle erforderlichen Tabellenblätter vorhanden
                  sind und die richtigen Namen haben
                </li>
              ) : (
                <li>
                  Achten Sie darauf, dass die Kopfzeile mit dem erwarteten
                  Format übereinstimmt
                </li>
              )}
              <li>Entfernen Sie leere Zeilen und doppelte Einträge</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidationErrors;
