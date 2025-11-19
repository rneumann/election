import Papa from 'papaparse';
import { EXPECTED_CSV_HEADERS } from '../../schemas/voter.schema.js';
import { logger } from '../../conf/logger/logger.js';

/**
 * Parse CSV file containing voter data.
 * Uses papaparse for robust CSV parsing with error handling.
 *
 * @param {File} file - CSV file to parse
 * @returns {Promise<{success: boolean, data?: Array, errors?: Array, headers?: Array}>}
 * @throws {Error} If file reading fails
 */
export const parseVoterCSV = (file) => {
  logger.debug(`Starting CSV parse for file: ${file.name}`);
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      trimHeaders: true,
      transformHeader: (header) => header.trim(),
      transform: (value) => value.trim(),
      complete: (results) => {
        const { data, errors: parseErrors, meta } = results;

        // Check for parsing errors
        if (parseErrors && parseErrors.length > 0) {
          return resolve({
            success: false,
            errors: parseErrors.map((err) => ({
              row: err.row + 2, // +2 for header and 0-index
              field: err.code,
              message: err.message,
              code: 'PARSE_ERROR',
            })),
          });
        }

        // Check if headers match expected format
        const actualHeaders = meta.fields || [];
        const missingHeaders = EXPECTED_CSV_HEADERS.filter((h) => !actualHeaders.includes(h));
        const extraHeaders = actualHeaders.filter((h) => !EXPECTED_CSV_HEADERS.includes(h));

        if (missingHeaders.length > 0 || extraHeaders.length > 0) {
          const headerErrors = [];

          if (missingHeaders.length > 0) {
            headerErrors.push({
              row: 1,
              field: 'Kopfzeile',
              message: `Fehlende Spalten: ${missingHeaders.join(', ')}`,
              code: 'MISSING_HEADERS',
            });
          }

          if (extraHeaders.length > 0) {
            headerErrors.push({
              row: 1,
              field: 'Kopfzeile',
              message: `Unerwartete Spalten: ${extraHeaders.join(', ')}`,
              code: 'EXTRA_HEADERS',
            });
          }

          headerErrors.push({
            row: 1,
            field: 'Kopfzeile',
            message: `Erwartete Spalten: ${EXPECTED_CSV_HEADERS.join(', ')}`,
            code: 'EXPECTED_HEADERS',
          });

          return resolve({
            success: false,
            errors: headerErrors,
          });
        }

        // Check if data is empty
        if (!data || data.length === 0) {
          return resolve({
            success: false,
            errors: [
              {
                row: null,
                field: null,
                message: 'Die CSV-Datei enthält keine Daten (nur Kopfzeile)',
                code: 'EMPTY_FILE',
              },
            ],
          });
        }

        // Filter out completely empty rows
        const validData = data.filter((row) => {
          return Object.values(row).some((value) => value && value.length > 0);
        });

        if (validData.length === 0) {
          return resolve({
            success: false,
            errors: [
              {
                row: null,
                field: null,
                message: 'Die CSV-Datei enthält nur leere Zeilen',
                code: 'NO_VALID_DATA',
              },
            ],
          });
        }

        logger.debug(`CSV parse successful: ${validData.length} valid rows`);
        resolve({
          success: true,
          data: validData,
          headers: actualHeaders,
        });
      },
      error: (error) => {
        resolve({
          success: false,
          errors: [
            {
              row: null,
              field: null,
              message: `Fehler beim Lesen der CSV-Datei: ${error.message}`,
              code: 'FILE_READ_ERROR',
            },
          ],
        });
      },
    });
  });
};
