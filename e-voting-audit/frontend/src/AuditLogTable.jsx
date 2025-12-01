import React, { useState, useEffect } from 'react';
import {
  Box,
  Collapse,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  TablePagination,
  Chip,
  CircularProgress
} from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp, Security, Warning, ErrorOutline, Info } from '@mui/icons-material';

// --- MOCK DATEN (Später durch API-Call ersetzen) ---
const mockLogs = [
  { id: 9, timestamp: "2025-12-01T14:45:00.000Z", action_type: "LOGIN_FAILED", actor_role: "unknown", level: "WARN", details: { reason: "invalid_password", ip: "192.168.1.55" }, entry_hash: "f911a3...", prev_hash: "58a6b..." },
  { id: 8, timestamp: "2025-12-01T14:40:00.000Z", action_type: "ELECTION_CREATED", actor_role: "admin", level: "INFO", details: { title: "StuPa Wahl 2025", config: "standard" }, entry_hash: "58a6b...", prev_hash: "08b7c..." },
  { id: 7, timestamp: "2025-12-01T14:35:00.000Z", action_type: "DB_CONNECTION_LOST", actor_role: "system", level: "FATAL", details: { error: "connection_refused" }, entry_hash: "08b7c...", prev_hash: "092e2..." },
];

/**
 * Hilfsfunktion für Status-Farben basierend auf Log-Level
 * Nutzt die Tailwind-Farben aus deiner Config
 */
const getLevelColor = (level) => {
  switch (level) {
    case 'FATAL':
    case 'CRITICAL':
    case 'ERROR':
      return { label: level, color: 'error', icon: <ErrorOutline fontSize="small" /> };
    case 'WARN':
      return { label: level, color: 'warning', icon: <Warning fontSize="small" /> };
    case 'INFO':
    default:
      return { label: level, color: 'primary', icon: <Info fontSize="small" /> }; // Primary ist HKA-Red laut Config
  }
};

/**
 * Einzelne Zeile (Row) Komponente
 * Ist ausgelagert, weil sie ihren eigenen "Open/Close"-State braucht.
 */
function Row({ row }) {
  const [open, setOpen] = useState(false);
  const status = getLevelColor(row.level);

  return (
    <>
      <TableRow 
        className="hover:bg-brand-light/20 transition-colors" 
        sx={{ '& > *': { borderBottom: 'unset' } }}
      >
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
            className="text-brand-primary"
          >
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row" className="font-mono text-gray-700">
          {row.id}
        </TableCell>
        <TableCell>
            {new Date(row.timestamp).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'medium' })}
        </TableCell>
        <TableCell>
            <span className="font-bold text-gray-800">{row.action_type}</span>
        </TableCell>
        <TableCell>{row.actor_role}</TableCell>
        <TableCell>
          <Chip 
            icon={status.icon} 
            label={status.label} 
            color={status.color} 
            size="small" 
            variant="outlined"
            className={row.level === 'INFO' ? 'border-brand-primary text-brand-primary' : ''} 
          />
        </TableCell>
      </TableRow>
      
      {/* Aufklappbarer Detail-Bereich */}
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box margin={2} className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <Typography variant="h6" gutterBottom component="div" className="text-brand-dark text-sm uppercase tracking-wide font-bold flex items-center gap-2">
                <Security fontSize="small" /> Sicherheits-Details
              </Typography>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                {/* Linke Seite: JSON Details */}
                <div>
                    <Typography variant="subtitle2" className="text-brand-gray mb-1">Event Details (JSON)</Typography>
                    <pre className="text-xs bg-white p-3 rounded border border-gray-300 overflow-x-auto text-gray-700">
                        {JSON.stringify(row.details, null, 2)}
                    </pre>
                </div>

                {/* Rechte Seite: Hash Chain Info */}
                <div>
                    <Typography variant="subtitle2" className="text-brand-gray mb-1">Blockchain Integrität</Typography>
                    <div className="flex flex-col gap-2">
                        <div className="bg-white p-2 rounded border border-gray-200">
                            <span className="text-2xs text-gray-400 block uppercase">Aktueller Hash</span>
                            <code className="text-xs text-brand-primary break-all">{row.entry_hash}</code>
                        </div>
                        <div className="bg-white p-2 rounded border border-gray-200 opacity-70">
                            <span className="text-2xs text-gray-400 block uppercase">Vorheriger Hash (Chain Link)</span>
                            <code className="text-xs text-gray-500 break-all">{row.prev_hash}</code>
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
}

/**
 * Hauptkomponente für die Tabelle
 */
export default function AuditLogTable() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    // TODO: Hier später den echten API Call einfügen
    // fetch('/api/audit-logs').then(...)
    
    // Simulation API Delay
    setTimeout(() => {
        setLogs(mockLogs);
        setLoading(false);
    }, 800);
  }, []);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <div className="w-full p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-brand-dark mb-1">Audit Logs</h2>
        <p className="text-brand-gray text-sm">Sicherheitsrelevante Ereignisse und Blockchain-Integrität.</p>
      </div>

      <Paper className="w-full mb-2 overflow-hidden shadow-lg border-t-4 border-brand-primary">
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader aria-label="audit log table">
            <TableHead>
              <TableRow>
                <TableCell width="50" className="bg-brand-light font-bold text-brand-dark" />
                <TableCell className="bg-brand-light font-bold text-brand-dark">ID</TableCell>
                <TableCell className="bg-brand-light font-bold text-brand-dark">Zeitstempel</TableCell>
                <TableCell className="bg-brand-light font-bold text-brand-dark">Aktion</TableCell>
                <TableCell className="bg-brand-light font-bold text-brand-dark">Akteur</TableCell>
                <TableCell className="bg-brand-light font-bold text-brand-dark">Level</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                    <TableCell colSpan={6} align="center" className="py-10">
                        <CircularProgress className="text-brand-primary" />
                        <Typography className="mt-2 text-gray-500">Lade Audit Logs...</Typography>
                    </TableCell>
                </TableRow>
              ) : (
                logs
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((row) => (
                    <Row key={row.id} row={row} />
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={logs.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          className="bg-gray-50"
        />
      </Paper>
    </div>
  );
}