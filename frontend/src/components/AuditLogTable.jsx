import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Collapse,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Typography,
  Paper,
  Chip,
  Toolbar,
  FormControlLabel,
  Switch,
  CircularProgress,
} from '@mui/material';
import {
  KeyboardArrowDown,
  KeyboardArrowUp,
  Warning,
  ErrorOutline,
  Info,
  FilterList,
} from '@mui/icons-material';
import { visuallyHidden } from '@mui/utils';

// --- HILFSFUNKTIONEN FÜR SORTIERUNG ---

/**
 * Holt den Wert eines Objekts sicher ohne dynamischen Zugriff (verhindert Object Injection).
 * @param {object} obj - Das Datenobjekt
 * @param {string} key - Der Schlüssel
 * @returns {string|number} Der Wert
 */
const getSafeValue = (obj, key) => {
  /* eslint-disable */
  switch (key) {
    case 'id':
      return obj.id;
    case 'timestamp':
      return obj.timestamp;
    case 'action_type':
      return obj.action_type;
    case 'actor_id':
      return obj.actor_id;
    case 'level':
      return obj.level;
    case 'details':
      // Details ist ein Objekt, für Sortierung machen wir es zum String oder ignorieren es
      return '';
    default:
      return '';
  }
};

/**
 * Vergleicht zwei Objekte basierend auf einem Schlüssel in absteigender Reihenfolge.
 * @param {object} a - Erstes Objekt
 * @param {object} b - Zweites Objekt
 * @param {string} orderBy - Der Schlüssel, nach dem sortiert werden soll
 * @returns {number} -1, 0 oder 1
 */
const descendingComparator = (a, b, orderBy) => {
  // Fix für "Generic Object Injection Sink":
  // Statt a[orderBy] nutzen wir eine explizite Switch-Funktion.
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

/**
 * Erstellt eine Vergleichsfunktion basierend auf der Sortierreihenfolge.
 * @param {string} order - 'asc' oder 'desc'
 * @param {string} orderBy - Der Schlüssel
 * @returns {Function} Die Vergleichsfunktion
 */
const getComparator = (order, orderBy) => {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
};

/**
 * Stabilisiert die Sortierung, damit Elemente mit gleichem Wert ihre relative Position behalten.
 * @param {Array} array - Das zu sortierende Array
 * @param {Function} comparator - Die Vergleichsfunktion
 * @returns {Array} Das sortierte Array
 */
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

const headCells = [
  { id: 'id', numeric: false, disablePadding: false, label: 'ID' },
  { id: 'timestamp', numeric: false, disablePadding: false, label: 'Zeitstempel' },
  { id: 'action_type', numeric: false, disablePadding: false, label: 'Aktion' },
  { id: 'actor_id', numeric: false, disablePadding: false, label: 'Akteur (ID)' },
  { id: 'level', numeric: false, disablePadding: false, label: 'Level' },
  { id: 'details', numeric: false, disablePadding: false, label: 'Details' },
];

// --- SUB-KOMPONENTEN ---

/**
 * Erweiterter Tabellenkopf mit Sortierfunktion.
 * @param {object} props - Die Props der Komponente
 * @returns {JSX.Element} Der Tabellenkopf
 */
const EnhancedTableHead = (props) => {
  const { order, orderBy, onRequestSort } = props;
  const createSortHandler = (property) => (event) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead className="bg-gray-100">
      <TableRow>
        <TableCell padding="none" />
        {headCells.map((headCell) =>
          headCell.id !== 'details' ? (
            <TableCell
              key={headCell.id}
              align={headCell.numeric ? 'right' : 'left'}
              padding={headCell.disablePadding ? 'none' : 'normal'}
              sortDirection={orderBy === headCell.id ? order : false}
              className="font-bold text-gray-700"
            >
              <TableSortLabel
                active={orderBy === headCell.id}
                direction={orderBy === headCell.id ? order : 'asc'}
                onClick={createSortHandler(headCell.id)}
              >
                {headCell.label}
                {orderBy === headCell.id ? (
                  <Box component="span" sx={visuallyHidden}>
                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                  </Box>
                ) : null}
              </TableSortLabel>
            </TableCell>
          ) : (
            <TableCell key="details" padding="none" />
          ),
        )}
      </TableRow>
    </TableHead>
  );
};

EnhancedTableHead.propTypes = {
  onRequestSort: PropTypes.func.isRequired,
  order: PropTypes.oneOf(['asc', 'desc']).isRequired,
  orderBy: PropTypes.string.isRequired,
};

/*
 * Eine einzelne Zeile in der Audit-Tabelle (aufklappbar).
 * @param {object} props - Die Props (enthält row data)
 * @returns {JSX.Element} Die Tabellenzeile
 */
const AuditRow = ({ row }) => {
  const [open, setOpen] = useState(false);

  /**
   * Bestimmt die Farbe des Status-Chips basierend auf dem Log-Level.
   * @param {string} level - Das Log-Level (INFO, WARN, ERROR, etc.)
   * @returns {object} Objekt mit color und icon
   */
  /* eslint-disable */
  const getLevelColor = (level) => {
    switch (level) {
      case 'FATAL':
      case 'CRITICAL':
      case 'ERROR':
        return { color: 'error', icon: <ErrorOutline fontSize="small" /> };
      case 'WARN':
        return { color: 'warning', icon: <Warning fontSize="small" /> };
      default:
        return { color: 'primary', icon: <Info fontSize="small" /> };
    }
  };
  const status = getLevelColor(row.level);

  return (
    <>
      <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          {row.id}
        </TableCell>
        <TableCell>{new Date(row.timestamp).toLocaleString()}</TableCell>
        <TableCell className="font-medium">{row.action_type}</TableCell>
        <TableCell>{row.actor_id}</TableCell>
        <TableCell>
          <Chip
            icon={status.icon}
            label={row.level}
            color={status.color}
            size="small"
            variant="outlined"
          />
        </TableCell>
        <TableCell padding="none" />
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box margin={2} className="bg-gray-50 p-4 rounded border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Typography variant="subtitle2" className="text-gray-500">
                    Event Details (JSON)
                  </Typography>
                  <pre className="text-xs bg-white p-2 border rounded overflow-auto mt-1">
                    {JSON.stringify(row.details, null, 2)}
                  </pre>
                </div>
                <div>
                  <Typography variant="subtitle2" className="text-gray-500 mb-1">
                    Integrität & Hash-Chain
                  </Typography>
                  <div className="flex flex-col gap-2">
                    <div className="text-xs">
                      <span className="font-bold block text-gray-400">ENTRY HASH</span>
                      <code className="break-all bg-blue-50 text-blue-800 p-1 rounded block">
                        {row.entry_hash}
                      </code>
                    </div>
                    <div className="text-xs">
                      <span className="font-bold block text-gray-400">PREV HASH</span>
                      <code className="break-all text-gray-500 p-1 block">{row.prev_hash}</code>
                    </div>
                  </div>
                </div>
              </div>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
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

// --- HAUPTKOMPONENTE ---

/**
 * Die Hauptkomponente für die Audit-Log-Tabelle.
 * Lädt Daten vom Backend und stellt sie dar.
 * @returns {JSX.Element} Die Tabelle
 */
const AuditLogTable = () => {
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('id');
  const [page, setPage] = useState(0);
  const [dense, setDense] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Daten laden (Async/Await statt Promise-Chains für saubereren Code)
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        // Falls du in vite.config.js einen Proxy hast, nutze '/api/audit/logs'
        const response = await fetch('/api/audit/logs');
        if (!response.ok) {
          throw new Error('Fehler beim Laden');
        }
        const data = await response.json();
        setLogs(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    void fetchLogs();
  }, []);

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleChangeDense = (event) => {
    setDense(event.target.checked);
  };

  const visibleRows = useMemo(
    () =>
      stableSort(logs, getComparator(order, orderBy)).slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage,
      ),
    [order, orderBy, page, rowsPerPage, logs],
  );

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ width: '100%', mb: 2, overflow: 'hidden' }}>
        <Toolbar className="pl-2 pr-1 flex justify-between">
          <Typography sx={{ flex: '1 1 100%' }} variant="h6" id="tableTitle" component="div">
            Einträge: {logs.length}
          </Typography>
          <IconButton title="Filter list">
            <FilterList />
          </IconButton>
        </Toolbar>

        <TableContainer sx={{ maxHeight: 650 }}>
          <Table
            stickyHeader
            sx={{ minWidth: 750 }}
            aria-labelledby="tableTitle"
            size={dense ? 'small' : 'medium'}
          >
            <EnhancedTableHead order={order} orderBy={orderBy} onRequestSort={handleRequestSort} />
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" className="py-10">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : (
                visibleRows.map((row) => <AuditRow key={row.id} row={row} />)
              )}
              {visibleRows.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Keine Logs gefunden.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={logs.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      <FormControlLabel
        control={<Switch checked={dense} onChange={handleChangeDense} />}
        label="Kompakte Ansicht"
        className="ml-2"
      />
    </Box>
  );
};

export default AuditLogTable;
