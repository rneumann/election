/* eslint-disable security/detect-object-injection */
import { logger } from '../conf/logger/logger.js';
import { client } from '../database/db.js';
import { parseCsv, parseExcel } from '../utils/parsers.js';

/**
 * Ensures all allowed columns exist with null fallback.
 * @param {Object} row - The input row object
 * @returns {Object} The cleaned row object
 */
const allowedColumns = ['uid', 'lastname', 'firstname', 'mtknr', 'faculty', 'notes'];
const candidateFileColumns = [...allowedColumns, 'keyword'];

export const safeRow = (row) => {
  const cleaned = {};
  for (const col of candidateFileColumns) {
    cleaned[col] = row[col] ?? null;
  }
  return cleaned;
};

/**
 * Inserts candidates and links them to an election within a single transaction.
 * @param {Array<Object>} data - Array of candidate objects
 * @param {string|null} electionId - UUID of the election to link candidates to (optional)
 * @returns {Promise<void>}
 */
const insertCandidates = async (data, electionId = null) => {
  if (!data.length) {
    logger.info('No candidate data found to insert.');
    return;
  }

  const cols = allowedColumns.join(', ');
  const placeholders = data
    .map(
      (_, i) =>
        `(${allowedColumns.map((__, j) => `$${i * allowedColumns.length + (j + 1)}`).join(', ')})`,
    )
    .join(', ');

  const flatValues = data.flatMap((row) => allowedColumns.map((col) => row[col]));

  // Alles in einer Transaktion — entweder alles oder nichts
  await client.query('BEGIN');
  try {
    // 1. Kandidaten einfügen / aktualisieren (gleiche uid = dieselbe Person)
    const insertResult = await client.query({
      text: `INSERT INTO candidates (${cols}) VALUES ${placeholders}
             ON CONFLICT (uid) DO UPDATE SET
               lastname  = EXCLUDED.lastname,
               firstname = EXCLUDED.firstname,
               mtknr     = EXCLUDED.mtknr,
               faculty   = EXCLUDED.faculty,
               notes     = EXCLUDED.notes
             RETURNING id, uid`,
      values: flatValues,
    });
    logger.info(`Upserted ${insertResult.rowCount} candidates.`);

    // 2. Falls eine Wahl angegeben → Kandidaten in electioncandidates verknüpfen
    if (electionId) {
      // Höchste bestehende listnum für diese Wahl ermitteln
      const maxRes = await client.query(
        'SELECT COALESCE(MAX(listnum), 0) AS max FROM electioncandidates WHERE electionId = $1',
        [electionId],
      );
      let nextListnum = maxRes.rows[0].max + 1;

      for (let i = 0; i < insertResult.rows.length; i++) {
        const row = insertResult.rows[i];
        const keyword = data[i]?.keyword ?? null;
        await client.query({
          text: `INSERT INTO electioncandidates (electionId, candidateId, listnum, keyword, is_adhoc)
                 VALUES ($1, $2, $3, $4, false)
                 ON CONFLICT (electionId, candidateId) DO UPDATE SET keyword = EXCLUDED.keyword`,
          values: [electionId, row.id, nextListnum, keyword],
        });
        nextListnum++;
      }
      logger.info(`Linked ${insertResult.rowCount} candidates to election ${electionId}.`);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('DB insert error — transaction rolled back:', err);
    throw new Error('Database error while inserting candidates.');
  }
};

/**
 * Main entry for candidate import.
 * @param {string} path - Path to the input file
 * @param {string} mimeType - MIME type of the input file
 * @param {string|null} electionId - UUID of the election to link candidates to (optional)
 * @returns {Promise<void>}
 */
export const importCandidateData = async (path, mimeType, electionId = null) => {
  logger.debug(`Parsing candidate file: ${path} (${mimeType}), electionId: ${electionId}`);

  // Parser mapping
  const parsers = {
    'text/csv': parseCsv,
    'application/vnd.ms-excel': parseCsv, // ältere CSV-MIME
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': parseExcel,
  };

  // Automatische Erkennung anhand Dateiendung, falls MIME falsch
  const lowerPath = path.toLowerCase();
  const isCsv = lowerPath.endsWith('.csv');
  const isXlsx = lowerPath.endsWith('.xlsx');

  const parser = parsers[mimeType] || (isCsv ? parseCsv : isXlsx ? parseExcel : null);

  if (!parser) {
    throw new Error(`Unsupported file type: ${mimeType} (${path})`);
  }

  try {
    const rawRows = await parser(path);

    const rows = rawRows.map((row, index) => {
      const cleaned = safeRow(row);
      // Generate UID if missing (CSV files don't have UID column)
      if (!cleaned.uid) {
        const namePart =
          cleaned.lastname && cleaned.firstname
            ? `${cleaned.lastname}_${cleaned.firstname}`.toLowerCase().replace(/[^a-z0-9_]/g, '')
            : `candidate_${index}`;
        cleaned.uid = namePart.substring(0, 30);
      }
      return cleaned;
    });

    logger.debug(`Parsed ${rows.length} candidate rows.`);

    await insertCandidates(rows, electionId);
  } catch (err) {
    logger.error('Candidate import process error:', err);
    throw err;
  }
};
