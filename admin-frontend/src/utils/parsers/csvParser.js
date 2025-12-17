import Papa from 'papaparse';
import { logger } from '../../conf/logger/logger';

/**
 * Expected CSV headers in the correct order.
 */
export const EXPECTED_CSV_HEADERS = ['RZ-Kennung', 'Fakultät', 'Vorname', 'Nachname', 'Matk.Nr'];

/**
 * Parses the voter CSV file. Tries UTF-8 first, then falls back to ISO-8859-1.
 *
 * @param {File} file - The uploaded CSV file.
 * @returns {Promise<Object>} A promise resolving to the parse result (success, data, errors).
 */
export const parseVoterCSV = (file) => {
  logger.debug(`Starting CSV parse for file: ${file.name}`);

  return new Promise((resolve) => {
    parseWithEncoding(file, 'UTF-8', (resultUTF8) => {
      const headers = resultUTF8.headers || [];

      const missingUmlautHeaders = !headers.includes('Fakultät');

      if (missingUmlautHeaders) {
        logger.warn(
          'Umlaut-Header fehlen in UTF-8. Versuche Neustart mit ISO-8859-1 (Excel Standard)...',
        );

        parseWithEncoding(file, 'ISO-8859-1', (resultISO) => {
          resolve(resultISO);
        });
      } else {
        resolve(resultUTF8);
      }
    });
  });
};

/**
 * Internal helper function for PapaParse.
 *
 * @param {File} file - The file to parse.
 * @param {string} encoding - The encoding to use (e.g., 'UTF-8').
 * @param {Function} callback - Callback function invoked with the result.
 */
const parseWithEncoding = (file, encoding, callback) => {
  Papa.parse(file, {
    header: true,
    encoding: encoding,
    skipEmptyLines: 'greedy',
    trimHeaders: true,
    // Removes BOM (Byte Order Mark) if present to prevent invisible characters
    transformHeader: (header) => header.trim().replace(/^\ufeff/, ''),
    transform: (value) => value.trim(),
    complete: (results) => {
      const processed = processParseResult(results);
      if (processed.meta) {
        processed.meta.usedEncoding = encoding;
      }
      callback(processed);
    },
    error: (error) => {
      callback({
        success: false,
        errors: [{ code: 'FILE_READ_ERROR', message: error.message, row: 0 }],
      });
    },
  });
};

/**
 * Processes the PapaParse result (checks headers and empty data).
 *
 * @param {Object} results - The raw result from PapaParse.
 * @returns {Object} The processed and validated result.
 */
const processParseResult = (results) => {
  const { data, errors: parseErrors, meta } = results;
  const actualHeaders = meta.fields || [];

  // 1. Check for critical parsing errors
  if (parseErrors && parseErrors.length > 0) {
    const criticalErrors = parseErrors.filter(
      (e) => e.code !== 'TooManyFields' && e.code !== 'NotEnoughFields',
    );

    if (criticalErrors.length > 0) {
      return {
        success: false,
        headers: actualHeaders,
        errors: criticalErrors.map((err) => ({
          row: (err.row || 0) + 2,
          field: err.code,
          message: err.message,
          code: 'PARSE_ERROR',
        })),
      };
    }
  }

  // 2. Check Headers
  const missingHeaders = EXPECTED_CSV_HEADERS.filter((h) => !actualHeaders.includes(h));
  const extraHeaders = actualHeaders.filter((h) => !EXPECTED_CSV_HEADERS.includes(h));

  // If headers are missing, we return this error (so the retry logic knows to try ISO-8859-1)
  if (missingHeaders.length > 0) {
    return {
      success: false,
      headers: actualHeaders,
      /* eslint-disable */
      errors: [
        {
          row: 1,
          field: 'Kopfzeile',
          message: `Fehlende Spalten: ${missingHeaders.join(', ')}`,
          code: 'MISSING_HEADERS',
        },
        ...(extraHeaders.length > 0
          ? [
              {
                row: 1,
                field: 'Kopfzeile',
                message: `Unerwartete Spalten: ${extraHeaders.join(', ')}`,
                code: 'EXTRA_HEADERS',
              },
            ]
          : []),
      ],
    };
  }

  // 3. Check for empty data
  const validData = data.filter((row) => Object.values(row).some((val) => val));
  if (!validData || validData.length === 0) {
    return {
      success: false,
      headers: actualHeaders,
      errors: [
        {
          row: null,
          field: null,
          message: 'Die Datei enthält keine Daten.',
          code: 'EMPTY_FILE',
        },
      ],
    };
  }

  return {
    success: true,
    data: validData,
    headers: actualHeaders,
  };
};
