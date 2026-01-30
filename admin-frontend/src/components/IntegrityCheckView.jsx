import { useState } from 'react';
import { integrityApi } from '../services/integrityApi';
import { useAlert } from '../context/AlertContext';
import ResponsiveButton from './ResponsiveButton';

const DetailedResultItem = ({ r, idx }) => {
  const [expanded, setExpanded] = useState(false);
  const hasErrors = !r.success && r.errors && r.errors.length > 0;

  return (
    <div
      className={`text-xs rounded border transition-colors ${
        r.success ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'
      }`}
    >
      <div
        className={`p-2 flex justify-between items-start ${
          hasErrors ? 'cursor-pointer hover:bg-red-200/50' : ''
        }`}
        onClick={() => hasErrors && setExpanded(!expanded)}
      >
        <div className="flex-1">
          <div className="font-bold flex items-center gap-2">
            <span>{r.success ? '✓' : '✗'}</span>
            <span>{r.electionInfo?.name || `Wahl ${idx + 1}`}</span>
          </div>
          <div className="text-gray-700 mt-1">{r.message}</div>
        </div>
        {hasErrors && (
          <div className="ml-2 pt-0.5 text-gray-500 font-bold shrink-0">{expanded ? '▲' : '▼'}</div>
        )}
      </div>

      {expanded && hasErrors && (
        <div className="px-2 pb-2">
          <div className="pl-2 border-l-2 border-red-300 bg-white/50 rounded-r p-2 space-y-2">
            {r.errors.map((err, errIdx) => (
              <div
                key={errIdx}
                className="text-red-900 text-xs break-words bg-red-50 p-3 rounded border border-red-200"
              >
                <div className="font-bold flex items-center gap-2 mb-2 text-red-800 border-b border-red-200 pb-2">
                  <span className="text-base">⚠️</span>
                  <span>
                    Inkonsistenz bei Stimmzettel #
                    {typeof err !== 'string' ? err.currentSerialId : '?'}
                  </span>
                </div>

                <div className="bg-white/60 p-2 rounded mb-3 text-gray-700 text-[11px] leading-relaxed">
                  <p>
                    <strong>Analyse:</strong>
                    <br />
                    Die Verkettung ist zwischen{' '}
                    <strong>
                      #{typeof err !== 'string' ? err.currentSerialId - 1 : '?'}
                    </strong> und{' '}
                    <strong>#{typeof err !== 'string' ? err.currentSerialId : '?'}</strong>{' '}
                    unterbrochen.
                  </p>
                  <p className="mt-2">Mögliche Ursachen:</p>
                  <ul className="list-disc pl-4 mt-1 space-y-1">
                    <li>
                      Daten in{' '}
                      <strong>#{typeof err !== 'string' ? err.currentSerialId - 1 : '?'}</strong>{' '}
                      wurden verändert (Hash passt nicht mehr).
                    </li>
                    <li>
                      Daten in{' '}
                      <strong>#{typeof err !== 'string' ? err.currentSerialId : '?'}</strong> wurden
                      manipuliert (Verweis wurde geändert).
                    </li>
                  </ul>
                </div>

                {typeof err !== 'string' && (err.expectedHash || err.foundHash) && (
                  <div className="space-y-2 font-mono text-[10px]">
                    {err.expectedHash && (
                      <div className="bg-green-50/50 p-2 rounded border border-green-200">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-green-800 uppercase tracking-wider text-[9px]">
                            Tatsächlicher Hash (Vorgänger #{err.currentSerialId - 1})
                          </span>
                          <span className="bg-green-100 text-green-800 text-[9px] px-1 rounded">
                            Berechnet
                          </span>
                        </div>
                        <div className="break-all border-l-2 border-green-500 pl-2 text-gray-600 bg-white py-1 pr-1">
                          {err.expectedHash}
                        </div>
                      </div>
                    )}

                    {err.foundHash && (
                      <div className="bg-red-50/50 p-2 rounded border border-red-200">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-red-800 uppercase tracking-wider text-[9px]">
                            Gespeicherter Verweis (in #{err.currentSerialId})
                          </span>
                          <span className="bg-red-100 text-red-800 text-[9px] px-1 rounded">
                            Ungültig
                          </span>
                        </div>
                        <div className="break-all border-l-2 border-red-500 pl-2 text-gray-600 bg-white py-1 pr-1">
                          {err.foundHash}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Komponente zur Anzeige von Integritätsprüfungsergebnissen
 * Prüft Blockchain-Integrität von Audit Logs und Stimmzetteln
 * @returns {JSX.Element}
 */
const IntegrityCheckView = () => {
  const [auditLogResult, setAuditLogResult] = useState(null);
  const [allBallotsResult, setAllBallotsResult] = useState(null);
  const [auditLogLoading, setAuditLogLoading] = useState(false);
  const [ballotLoading, setBallotLoading] = useState(false);
  const { showAlert } = useAlert();

  const handleCheckAuditLog = async () => {
    setAuditLogLoading(true);
    try {
      const result = await integrityApi.checkAuditLogChain();
      setAuditLogResult(result);
      showAlert(result.message, result.success ? 'success' : 'error', 5);
    } catch (err) {
      showAlert(`Fehler bei Audit Log Prüfung: ${err.message}`, 'error');
    } finally {
      setAuditLogLoading(false);
    }
  };

  const handleCheckAllBallots = async () => {
    setBallotLoading(true);
    try {
      const result = await integrityApi.checkAllBallotChains();
      setAllBallotsResult(result);
      showAlert(result.message, result.success ? 'success' : 'error', 5);
    } catch (err) {
      showAlert(`Fehler bei Stimmzettel Prüfung: ${err.message}`, 'error');
    } finally {
      setBallotLoading(false);
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

          {result.totalBallots !== undefined && (
            <div className={`text-sm ${textColor}`}>
              ✓ Geprüfte Stimmzettel: <span className="font-bold">{result.totalBallots}</span>
              {result.verifiedBallots !== undefined && (
                <span className="ml-2">({result.verifiedBallots} verifiziert)</span>
              )}
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
                    {error.type && (
                      <span className="font-mono font-bold text-red-600">[{error.type}] </span>
                    )}
                    {typeof error === 'string' ? error : error.message || JSON.stringify(error)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.results && result.results.length > 0 && (
            <div className="mt-4">
              <div className="font-bold mb-2">📊 Detaillierte Ergebnisse:</div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {result.results.map((r, idx) => (
                  <DetailedResultItem key={idx} r={r} idx={idx} />
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
            disabled={auditLogLoading}
            variant="primary"
            size="medium"
          >
            {auditLogLoading ? '⏳ Wird geprüft...' : '🔍 Jetzt prüfen'}
          </ResponsiveButton>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-bold mb-3 text-lg">🗳️ Alle Stimmzettel</h3>
          <p className="text-sm text-gray-600 mb-4">
            Prüft alle Wahlen und deren Stimmzettel-Ketten auf Manipulationen
          </p>
          <ResponsiveButton
            onClick={handleCheckAllBallots}
            disabled={ballotLoading}
            variant="primary"
            size="medium"
          >
            {ballotLoading ? '⏳ Wird geprüft...' : '🔍 Jetzt prüfen'}
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
