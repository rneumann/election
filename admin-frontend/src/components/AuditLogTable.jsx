import { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Spinner } from './Spinner';

// --- ICONS ---
const ChevronDownIcon = () => (
  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

const SortIcon = ({ direction }) => (
  <svg
    className={`w-4 h-4 inline-block ml-1 transition-transform ${
      direction === 'desc' ? 'rotate-180' : ''
    }`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

SortIcon.propTypes = { direction: PropTypes.string };

const FilterIcon = () => (
  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
    />
  </svg>
);

const SearchIcon = () => (
  <svg
    className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

// --- SORTIERUNG ---

const getSafeValue = (row, key) => {
  /* eslint-disable */
  switch (key) {
    case 'id':
      return row.id;
    case 'timestamp':
      return row.timestamp;
    case 'action_type':
      return row.action_type;
    case 'actor_id':
      return row.actor_id;
    case 'level':
      return row.level;
    default:
      return '';
  }
};

const descendingComparator = (a, b, orderBy) => {
  const valA = getSafeValue(a, orderBy);
  const valB = getSafeValue(b, orderBy);

  if (valB < valA) {
    return -1;
  }
  if (valB > valA) {
    return 1;
  }
  return 0;
};

const getComparator = (order, orderBy) => {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
};

const stableSort = (array, comparator) => {
  const stabilizedThis = array.map((el, index) => [el, index]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) {
      return order;
    }
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
};

// --- SUB-KOMPONENTEN ---

const AuditRow = ({ row }) => {
  const [open, setOpen] = useState(false);

  const getStatusStyles = (level) => {
    /* eslint-disable */
    switch (level) {
      case 'FATAL':
      case 'CRITICAL':
      case 'ERROR':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'WARN':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <>
      <tr
        onClick={() => setOpen(!open)}
        className="hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-200"
      >
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-10">
          <button className="focus:outline-none p-1 rounded hover:bg-gray-200">
            {open ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </button>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.id}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {new Date(row.timestamp).toLocaleString('de-DE')}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700">
          {row.action_type}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.actor_id || '-'}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm">
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusStyles(
              row.level,
            )}`}
          >
            {row.level}
          </span>
        </td>
      </tr>

      {open && (
        <tr className="bg-gray-50 border-b border-gray-200">
          <td colSpan="6" className="px-6 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Event Details (JSON)
                </h4>
                <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap font-mono bg-gray-50 p-2 rounded">
                  {JSON.stringify(row.details, null, 2)}
                </pre>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Blockchain Integrität
                </h4>
                <div className="space-y-3">
                  <div>
                    <span className="block text-xs font-semibold text-gray-400">ENTRY HASH</span>
                    <code className="block mt-1 text-xs bg-blue-50 text-blue-800 p-2 rounded border border-blue-100 break-all font-mono">
                      {row.entry_hash}
                    </code>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-gray-400">PREV HASH</span>
                    <code className="block mt-1 text-xs text-gray-500 p-2 break-all font-mono">
                      {row.prev_hash}
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

AuditRow.propTypes = {
  row: PropTypes.shape({
    id: PropTypes.string.isRequired,
    timestamp: PropTypes.string.isRequired,
    action_type: PropTypes.string.isRequired,
    actor_id: PropTypes.string,
    level: PropTypes.string.isRequired,
    details: PropTypes.object,
    entry_hash: PropTypes.string,
    prev_hash: PropTypes.string,
  }).isRequired,
};

// --- Integritätsprüfung ---
const ShieldCheckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  </svg>
);

// --- HAUPTKOMPONENTE ---

const AuditLogTable = () => {
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('id');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10); // NEU: State für RowsPerPage

  // Ballot Integrity Check State
  const [integrityResult, setIntegrityResult] = useState(null);
  const [integrityLoading, setIntegrityLoading] = useState(false);

  const verifyBallotIntegrity = async () => {
    setIntegrityLoading(true);
    try {
      const response = await fetch('/api/audit/verify-ballots');
      if (!response.ok) {
        throw new Error('Fehler bei der Integritätsprüfung');
      }
      const data = await response.json();
      setIntegrityResult(data);
    } catch (err) {
      setIntegrityResult({
        valid: false,
        summary: 'Fehler bei der Verbindung zum Server.',
        errors: [{ type: 'CONNECTION_ERROR', message: err.message }],
      });
    } finally {
      setIntegrityLoading(false);
    }
  };

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch('/api/audit/logs');
        if (!response.ok) {
          throw new Error('Fehler beim Laden der Protokolle');
        }
        const data = await response.json();
        setLogs(data);
        setError(null);
      } catch (err) {
        setError('Verbindung zum Server fehlgeschlagen.');
      } finally {
        setLoading(false);
      }
    };
    void fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        searchTerm === '' ||
        log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.actor_id && log.actor_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
        log.id.toString().includes(searchTerm);

      const matchesLevel = levelFilter === 'ALL' || log.level === levelFilter;

      return matchesSearch && matchesLevel;
    });
  }, [logs, searchTerm, levelFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, levelFilter]);

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(1);
  };

  const sortedLogs = useMemo(
    () => stableSort(filteredLogs, getComparator(order, orderBy)),
    [filteredLogs, order, orderBy],
  );

  const totalPages = Math.ceil(sortedLogs.length / rowsPerPage);
  const currentLogs = sortedLogs.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const headCells = [
    { id: 'id', label: 'ID' },
    { id: 'timestamp', label: 'Zeitstempel' },
    { id: 'action_type', label: 'Aktion' },
    { id: 'actor_id', label: 'Akteur' },
    { id: 'level', label: 'Level' },
  ];

  return (
    <div className="w-full">
      {/* --- BALLOT INTEGRITY CHECK PANEL --- */}
      <div className="mb-6 bg-white border border-gray-200 rounded-lg shadow-sm p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-md font-bold text-gray-800 flex items-center gap-2">
              <ShieldCheckIcon />
              Wahlintegrität prüfen
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Prüft die Blockchain-Integrität aller abgegebenen Stimmen (Ballot-Hash-Kette)
            </p>
          </div>
          <button
            onClick={verifyBallotIntegrity}
            disabled={integrityLoading}
            className="px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
          >
            {integrityLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Prüfe...
              </>
            ) : (
              <>
                <ShieldCheckIcon />
                Integrität prüfen
              </>
            )}
          </button>
        </div>

        {/* Ergebnis-Anzeige */}
        {integrityResult && (
          <div
            className={`mt-4 p-4 rounded-lg border ${
              integrityResult.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {integrityResult.valid ? (
                <svg
                  className="w-6 h-6 text-green-600 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6 text-red-600 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              )}
              <div className="flex-1">
                <p
                  className={`font-semibold ${
                    integrityResult.valid ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {integrityResult.summary}
                </p>
                {integrityResult.checkedAt && (
                  <p className="text-sm text-gray-500 mt-1">
                    Geprüft: {new Date(integrityResult.checkedAt).toLocaleString('de-DE')} •{' '}
                    {integrityResult.totalBallots} Ballots in {integrityResult.electionsChecked}{' '}
                    Wahlen
                  </p>
                )}

                {/* Fehler-Details */}
                {integrityResult.errors && integrityResult.errors.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-red-700 mb-2">
                      Gefundene Fehler ({integrityResult.errors.length}):
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {integrityResult.errors.map((err, idx) => (
                        <div
                          key={idx}
                          className="bg-white p-2 rounded border border-red-200 text-xs"
                        >
                          <span className="font-mono font-bold text-red-600">[{err.type}]</span>
                          <span className="ml-2 text-gray-700">{err.message}</span>
                          {err.electionId && (
                            <div className="mt-1 text-gray-500">
                              Wahl:{' '}
                              <code className="bg-gray-100 px-1 rounded">{err.electionId}</code>
                              {err.serialId && <span> • Ballot #{err.serialId}</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setIntegrityResult(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- FILTER BAR --- */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-end sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Audit Logs</h2>
          <p className="text-sm text-gray-500">{filteredLogs.length} Einträge gefunden</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* Suche */}
          <div className="relative">
            <input
              type="text"
              placeholder="Suche (Aktion, Akteur, ID)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none w-full sm:w-64"
            />
            <SearchIcon />
          </div>

          {/* Level Filter */}
          <div className="relative">
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="pl-9 pr-8 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none appearance-none bg-white cursor-pointer w-full sm:w-auto"
            >
              <option value="ALL">Alle Level</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="FATAL">FATAL</option>
            </select>
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <FilterIcon />
            </div>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
              <ChevronDownIcon />
            </div>
          </div>

          {/* Reset Button */}
          {(searchTerm || levelFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setLevelFilter('ALL');
              }}
              className="text-sm text-gray-500 hover:text-brand-primary underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* --- TABELLE --- */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="w-10 px-6 py-3"></th>
                {headCells.map((headCell) => (
                  <th
                    key={headCell.id}
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                    onClick={() => handleRequestSort(headCell.id)}
                  >
                    <div className="flex items-center gap-1">
                      {headCell.label}
                      {orderBy === headCell.id && <SortIcon direction={order} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <Spinner />
                    </div>
                    <p className="mt-2 text-gray-500">Lade Protokolle...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-red-500">
                      <svg
                        className="w-8 h-8 mb-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="font-medium">{error}</p>
                      <p className="text-sm mt-1 text-gray-500">
                        Bitte versuchen Sie es später erneut.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : currentLogs.length > 0 ? (
                currentLogs.map((row) => <AuditRow key={row.id} row={row} />)
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    Keine Einträge gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* --- PAGINATION & ROWS PER PAGE --- */}
        {totalPages >= 1 && !error && (
          <div className="bg-white px-4 py-3 flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 sm:px-6 gap-4">
            {/* NEU: Rows per Page Dropdown */}
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span>Zeilen pro Seite:</span>
              <select
                value={rowsPerPage}
                onChange={handleChangeRowsPerPage}
                className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={1000000}>1000000</option>
                <option value={-1}>-1</option>
              </select>
            </div>

            <div className="flex-1 flex justify-center sm:justify-end">
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-700 hidden sm:block">
                  Seite <span className="font-medium">{currentPage}</span> von{' '}
                  <span className="font-medium">{totalPages || 1}</span>
                </p>
                <nav
                  className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                  aria-label="Pagination"
                >
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="sr-only">Zurück</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {/* Seitenzahlen */}
                  <div className="hidden sm:flex">
                    {[...Array(totalPages)].map((_, i) => {
                      if (
                        i + 1 === 1 ||
                        i + 1 === totalPages ||
                        (i + 1 >= currentPage - 1 && i + 1 <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i + 1)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === i + 1
                                ? 'z-10 bg-brand-primary border-brand-primary text-white'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {i + 1}
                          </button>
                        );
                      } else if (i + 1 === currentPage - 2 || i + 1 === currentPage + 2) {
                        return (
                          <span
                            key={i}
                            className="px-2 py-2 border border-gray-300 bg-white text-gray-700"
                          >
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="sr-only">Weiter</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogTable;
