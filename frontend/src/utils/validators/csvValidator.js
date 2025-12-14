/* eslint-disable security/detect-object-injection */
import Papa from 'papaparse';
// IMPORTANT: Import VOTER_CSV_MAPPING here!
import { voterListSchema, VOTER_CSV_MAPPING } from '../../schemas/voter.schema.js';
import { parseVoterCSV } from '../parsers/csvParser.js';
import { logger } from '../../conf/logger/logger.js';
import { CANDIDATE_CSV_MAPPING } from '../../schemas/candidate.schema.js';
import { MAX_FILE_SIZE } from './constants.js';

/**
 * Validate CSV file containing voter data.
 * Combines parsing and Zod schema validation.
 *
 * @param {File} file - The CSV file to validate.
 * @returns {Promise<Object>} Validation result with success, errors, and data/stats if successful.
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
          errors.push({
            row: null,
            field: null,
            message: error.message,
            code: 'VALIDATION_ERROR',
          });
        } else if (path.length === 1) {
          errors.push({
            row: path[0] + 2,
            field: null,
            message: error.message,
            code: 'ROW_ERROR',
          });
        } else {
          const rowIndex = path[0];
          const fieldName = path[1];

          errors.push({
            row: rowIndex + 2,
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

  // Step 3: Check for duplicate RZ-Kennungen and Matrikelnummern
  const uidSet = new Set();
  const mtknrSet = new Set();
  const duplicateErrors = [];

  validationResult.data.forEach((voter, index) => {
    const uid = voter['RZ-Kennung'];
    const mtknr = voter['Matk.Nr'];

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
 * Validate CSV file containing candidate data.
 * Checks for required headers and missing values.
 *
 * @param {File} file - The CSV file to validate.
 * @returns {Promise<Object>} Validation result with success, errors, and data/stats if successful.
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

      // The columns expected for candidates
      const requiredHeaders = ['Nachname', 'Vorname', 'MatrikelNr', 'Fakultaet'];

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

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim().replace(/"/g, ''));
        const rowData = {};
        headers.forEach((h, idx) => (rowData[h] = values[idx]));

        if (!rowData['MatrikelNr'] && !rowData['matrikelnr']) {
          errors.push({
            row: i + 1,
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
 * Transforms the uploaded candidate file (with German headers) to a file with English headers.
 *
 * @param {File} file - The original candidate CSV file.
 * @returns {Promise<File>} The new CSV file with mapped headers.
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

/**
 * Takes the uploaded file (with German headers),
 * renames the headers to English keys based on the mapping.
 * USES parseVoterCSV to avoid encoding (ISO-8859-1) and BOM issues.
 *
 * @param {File} file - The uploaded CSV file with German headers.
 * @returns {Promise<File>} - The transformed CSV file with English headers.
 */
export const transformVoterFile = async (file) => {
  try {
    // 1. We use the more robust parser from csvParser.js
    // This handles encoding detection (Umlauts!) and BOM.
    const result = await parseVoterCSV(file);

    if (!result.success) {
      throw new Error('Fehler beim Verarbeiten der CSV für den Upload.');
    }

    const data = result.data; // These are the clean data with German keys

    // 2. Map data
    const transformedData = data.map((row) => {
      const newRow = {};

      Object.keys(row).forEach((germanKey) => {
        // .trim() is good for safety, although parseVoterCSV usually does this already
        const cleanGermanKey = germanKey.trim();
        const englishKey = VOTER_CSV_MAPPING[cleanGermanKey];

        if (englishKey) {
          newRow[englishKey] = row[germanKey];
        }
      });

      return newRow;
    });

    // 3. Convert back to CSV (Standard format for backend)
    const newCSV = Papa.unparse(transformedData, {
      quotes: true,
      delimiter: ',', // Backend parser (csv-parser) handles commas well
    });

    // 4. Create new file
    return new File([newCSV], 'voters_import_mapped.csv', {
      type: 'text/csv',
      lastModified: new Date().getTime(),
    });
  } catch (error) {
    logger.error('Fehler in transformVoterFile', error);
    throw error;
  }
};
