import { useState } from 'react';
import { integrityApi } from '../services/integrityApi';
import { useAlert } from '../context/AlertContext';
import ResponsiveButton from './ResponsiveButton';

/**
 * Komponente zur Anzeige von Integritätsprüfungsergebnissen
 * Prüft Blockchain-Integrität von Audit Logs und Stimmzetteln
 * @returns {JSX.Element}
 */
const IntegrityCheckView = () => {
  const [auditLogResult, setAuditLogResult] = useState(null);
  const [allBallotsResult, setAllBallotsResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const { showAlert } = useAlert();

  const handleCheckAuditLog = async () => {
    setLoading(true);
    try {
      const result = await integrityApi.checkAuditLogChain();
      setAuditLogResult(result);
      showAlert(result.message, result.success ? 'success' : 'error', 5);
    } catch (err) {
      showAlert(`Fehler bei Audit Log Prüfung: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAllBallots = async () => {
    setLoading(true);
    try {
      const result = await integrityApi.checkAllBallotChains();
      setAllBallotsResult(result);
      showAlert(result.message, result.success ? 'success' : 'error', 5);
    } catch (err) {
      showAlert(`Fehler bei Stimmzettel Prüfung: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const ResultBox = ({ title, result, icon }) => {
    if (!result) {
      return null;
    }

    const isSuccess = result.success;
    const bgColor = isSuccess ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
    const textColor = isSuccess ? 'text-green-800' : 'text-red-800';
    const headerColor = isSuccess ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900';

    return (
      <div className={`border rounded-lg ${bgColor}`}>
        <div className={`px-4 py-3 ${headerColor} font-bold rounded-t-lg`}>
          {icon} {title}
        </div>
        <div className="p-4 space-y-3">
          <div className={`text-sm ${textColor} font-bold`}>{result.message}</div>

          {result.totalChecked !== undefined && (
            <div className={`text-sm ${textColor}`}>
              ✓ Geprüfte Einträge: <span className="font-bold">{result.totalChecked}</span>
            </div>
          )}

          {result.totalElections !== undefined && (
            <div className={`text-sm ${textColor}`}>
              ✓ Geprüfte Wahlen: <span className="font-bold">{result.totalElections}</span>
            </div>
          )}

          {result.timestamp && (
            <div className="text-xs text-gray-600 mt-2">
              Geprüft: {new Date(result.timestamp).toLocaleString('de-DE')}
            </div>
          )}

          {result.errors && result.errors.length > 0 && (
            <div className="mt-4">
              <div className="font-bold text-red-900 mb-2">⚠️ Fehler gefunden:</div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {result.errors.map((error, idx) => (
                  <div key={idx} className="text-xs bg-red-100 p-2 rounded border border-red-300">
                    {typeof error === 'string' ? error : error.message || JSON.stringify(error)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.results && result.results.length > 0 && (
            <div className="mt-4">
              <div className="font-bold mb-2">📊 Detaillierte Ergebnisse:</div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {result.results.map((r, idx) => (
                  <div
                    key={idx}
                    className={`text-xs p-2 rounded border ${
                      r.success ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'
                    }`}
                  >
                    <div className="font-bold">
                      {r.success ? '✓' : '✗'} {r.electionInfo?.name || `Wahl ${idx + 1}`}
                    </div>
                    <div className="text-gray-700">{r.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Erklärung */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-bold text-blue-900 mb-2">🔒 Integritätsprüfung</h3>
        <p className="text-sm text-blue-800">
          Überprüfen Sie die Sicherheit und Unverfälschtheit der Wahldaten durch Prüfung der
          Blockchain-Ketten. Diese Prüfung vergleicht Hash-Werte, um sicherzustellen, dass keine
          Daten manipuliert wurden.
        </p>
      </div>

      {/* Prüf-Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-bold mb-3 text-lg">📋 Audit Log Chain</h3>
          <p className="text-sm text-gray-600 mb-4">
            Prüft die gesamte Abfolgekette aller Verwaltungsaktionen
          </p>
          <ResponsiveButton
            onClick={handleCheckAuditLog}
            disabled={loading}
            variant="primary"
            size="medium"
          >
            {loading ? '⏳ Wird geprüft...' : '🔍 Jetzt prüfen'}
          </ResponsiveButton>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-bold mb-3 text-lg">🗳️ Alle Stimmzettel</h3>
          <p className="text-sm text-gray-600 mb-4">
            Prüft alle Wahlen und deren Stimmzettel-Ketten auf Manipulationen
          </p>
          <ResponsiveButton
            onClick={handleCheckAllBallots}
            disabled={loading}
            variant="primary"
            size="medium"
          >
            {loading ? '⏳ Wird geprüft...' : '🔍 Jetzt prüfen'}
          </ResponsiveButton>
        </div>
      </div>

      {/* Ergebnisse */}
      {auditLogResult && (
        <ResultBox
          title="Audit Log Chain Ergebnis"
          result={auditLogResult}
          icon={auditLogResult.success ? '✓' : '✗'}
        />
      )}

      {allBallotsResult && (
        <ResultBox
          title="Stimmzettel Chain Ergebnisse"
          result={allBallotsResult}
          icon={allBallotsResult.success ? '✓' : '✗'}
        />
      )}
    </div>
  );
};

export default IntegrityCheckView;
