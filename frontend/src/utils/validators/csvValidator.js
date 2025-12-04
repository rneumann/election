/* eslint-disable security/detect-object-injection */
import Papa from 'papaparse';
import { voterListSchema } from '../../schemas/voter.schema.js';
import { parseVoterCSV } from '../parsers/csvParser.js';
import { logger } from '../../conf/logger/logger.js';
import { CANDIDATE_CSV_MAPPING } from '../../schemas/candidate.schema.js';
import { MAX_FILE_SIZE } from './constants.js';

/**
 * Validate CSV file containing voter data.
 * Combines parsing and Zod schema validation.
 *
 * @param {File} file - CSV file to validate
 * @returns {Promise<{success: boolean, data?: Array, errors?: Array, stats?: Object}>}
 */
export const validateVoterCSV = async (file) => {
  const fileExtension = file.name.split('.').pop();
  logger.info(
    `Starting CSV validation for file type: .${fileExtension}, size: ${(file.size / 1024).toFixed(2)}KB`,
  );

  // Step 0: Check file size
  if (file.size > MAX_FILE_SIZE) {
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
    const maxSizeMB = (MAX_FILE_SIZE / 1024 / 1024).toFixed(0);
    logger.warn(`File size exceeds limit: ${fileSizeMB}MB > ${maxSizeMB}MB`);
    return {
      success: false,
      errors: [
        {
          row: null,
          field: null,
          message: `Datei zu groß (${fileSizeMB}MB). Maximal ${maxSizeMB}MB erlaubt.`,
          code: 'FILE_TOO_LARGE',
        },
      ],
    };
  }

  // Step 1: Parse CSV file
  const parseResult = await parseVoterCSV(file);

  if (!parseResult.success) {
    logger.warn(
      'CSV parsing failed:',
      parseResult.errors.map((e) => e.code),
    );
    return {
      success: false,
      errors: parseResult.errors,
    };
  }

  const { data } = parseResult;
  logger.debug(`CSV parsed successfully: ${data.length} rows`);

  // Step 2: Validate with Zod schema
  const validationResult = voterListSchema.safeParse(data);

  if (!validationResult.success) {
    const errorCount = validationResult.error?.errors?.length || 0;
    logger.warn(`CSV validation failed: ${errorCount} error(s)`);
    const errors = [];

    if (validationResult.error && validationResult.error.errors) {
      validationResult.error.errors.forEach((error) => {
        const path = error.path;

        if (path.length === 0) {
          // Array-level error (e.g., minimum length)
          errors.push({
            row: null,
            field: null,
            message: error.message,
            code: 'VALIDATION_ERROR',
          });
        } else if (path.length === 1) {
          // Array index only (row-level error)
          errors.push({
            row: path[0] + 2, // +2 for header and 0-index
            field: null,
            message: error.message,
            code: 'ROW_ERROR',
          });
        } else {
          // Field-level error
          const rowIndex = path[0];
          const fieldName = path[1];

          errors.push({
            row: rowIndex + 2, // +2 for header and 0-index
            field: fieldName,
            message: error.message,
            code: 'FIELD_ERROR',
          });
        }
      });
    }

    return {
      success: false,
      errors,
    };
  }

  // Step 3: Check for duplicate RZ-Kennungen and Matrikelnummern (combined for performance)
  const uidSet = new Set();
  const mtknrSet = new Set();
  const duplicateErrors = [];

  validationResult.data.forEach((voter, index) => {
    const uid = voter['RZ-Kennung'];
    const mtknr = voter['Matk.Nr'];

    // Check for duplicate RZ-Kennung
    if (uidSet.has(uid)) {
      duplicateErrors.push({
        row: index + 2,
        field: 'RZ-Kennung',
        message: `Doppelte RZ-Kennung: ${uid} wurde bereits in einer vorherigen Zeile verwendet`,
        code: 'DUPLICATE_UID',
      });
    } else {
      uidSet.add(uid);
    }

    // Check for duplicate Matrikelnummer (if present)
    if (mtknr && mtknr.trim() !== '') {
      if (mtknrSet.has(mtknr)) {
        duplicateErrors.push({
          row: index + 2,
          field: 'Matk.Nr',
          message: `Doppelte Matrikelnummer: ${mtknr} wurde bereits in einer vorherigen Zeile verwendet`,
          code: 'DUPLICATE_MTKNR',
        });
      } else {
        mtknrSet.add(mtknr);
      }
    }
  });

  if (duplicateErrors.length > 0) {
    logger.warn(`Duplicate entries found: ${duplicateErrors.length} duplicate(s)`);
    return {
      success: false,
      errors: duplicateErrors,
    };
  }

  // Step 4: Calculate statistics
  const faculties = new Set(validationResult.data.map((v) => v.Fakultät));

  logger.info('CSV validation successful:', {
    totalVoters: validationResult.data.length,
    faculties: faculties.size,
  });

  return {
    success: true,
    data: validationResult.data,
    stats: {
      totalVoters: validationResult.data.length,
      faculties: faculties.size,
      facultyList: [...faculties].sort(),
    },
  };
};

/**
 * Validates a candidate CSV file against the required schema.
 * Expected columns: Nachname, Vorname, MatrikelNr, Fakultät, Schlüsselworte, Notizen, IstZugelassen
 * @param {File} file - The CSV file to validate
 * @returns {Promise<{success: boolean, data?: Array, errors?: Array, stats?: Object}>}
 */
export const validateCandidateCSV = async (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l);

      if (lines.length < 1) {
        return resolve({
          success: false,
          errors: [{ message: 'Die Datei ist leer.', code: 'EMPTY' }],
        });
      }

      const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));

      // Die Spalten, die für Kandidaten erwartet werden
      const requiredHeaders = [
        'Nachname',
        'Vorname',
        'MatrikelNr',
        'Fakultaet',
        // 'Schlüsselworte', 'Notizen', 'IstZugelassen' sind oft optional
      ];

      // 1. Kopfzeile prüfen
      const missingHeaders = requiredHeaders.filter(
        (req) => !headers.some((h) => h.toLowerCase() === req.toLowerCase()),
      );

      if (missingHeaders.length > 0) {
        return resolve({
          success: false,
          errors: [
            {
              message: `Falsches Format! Es fehlen Spalten für Kandidaten: ${missingHeaders.join(', ')}.`,
              code: 'MISSING_HEADERS',
            },
          ],
        });
      }

      const errors = [];
      const data = [];

      // 2. Zeilen prüfen
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim().replace(/"/g, ''));

        // Simples Mapping basierend auf Index
        const rowData = {};
        headers.forEach((h, idx) => (rowData[h] = values[idx]));

        // Pflichtfeld-Prüfung (Beispiel)
        if (!rowData['MatrikelNr'] && !rowData['matrikelnr']) {
          errors.push({
            row: i + 1, // +1 weil Zeile 1 der Header ist
            field: 'MatrikelNr',
            message: 'Matrikelnummer fehlt',
            code: 'MISSING_VALUE',
          });
        }

        data.push(rowData);
      }

      resolve({
        success: errors.length === 0,
        errors,
        data,
        stats: {
          totalCandidates: data.length,
        },
      });
    };
    reader.readAsText(file);
  });
};

/**
 * Liest die CSV, benennt die Header um und gibt ein NEUES File-Objekt zurück.
 * @param {File} file - Die Originaldatei (mit deutschen Headern)
 * @returns {Promise<File>} - Die neue Datei (mit englischen Headern)
 */
export const transformCandidateFile = (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        const data = results.data;

        const transformedData = data.map((row) => {
          const newRow = {};
          Object.keys(row).forEach((germanKey) => {
            const englishKey = CANDIDATE_CSV_MAPPING[germanKey.trim()];

            if (englishKey) {
              if (englishKey === 'approved') {
                const val = row[germanKey];
                const isTrue =
                  typeof val === 'string' &&
                  ['true', '1', 'ja', 'wahr'].includes(val.toLowerCase());
                newRow[englishKey] = isTrue ? 'true' : 'false';
              } else {
                newRow[englishKey] = row[germanKey];
              }
            }
          });
          return newRow;
        });

        const newCSV = Papa.unparse(transformedData, {
          quotes: true,
          delimiter: ',',
        });

        const newFile = new File([newCSV], 'candidates_import.csv', {
          type: 'text/csv',
          lastModified: new Date().getTime(),
        });

        resolve(newFile);
      },
      error: (err) => reject(err),
    });
  });
};
