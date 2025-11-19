import * as XLSX from 'xlsx';
import { EXPECTED_SHEET_NAMES } from '../../schemas/election.schema.js';

/**
 * Parse Excel file containing election configuration.
 * Uses xlsx library for reading Excel files with multiple sheets.
 *
 * @param {File} file - Excel file to parse
 * @returns {Promise<{success: boolean, data?: Object, errors?: Array, sheets?: Array}>}
 * @throws {Error} If file reading fails
 */
export const parseElectionExcel = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {
          type: 'array',
          cellDates: true,
          cellFormula: false, // Security: Don't parse formulas
          sheetStubs: false, // Ignore empty cells
        });

        // Check if all required sheets exist
        const actualSheets = workbook.SheetNames;
        const requiredSheets = [EXPECTED_SHEET_NAMES.INFO, EXPECTED_SHEET_NAMES.CANDIDATES];
        const missingSheets = requiredSheets.filter((sheet) => !actualSheets.includes(sheet));

        if (missingSheets.length > 0) {
          return resolve({
            success: false,
            errors: [
              {
                sheet: null,
                row: null,
                field: null,
                message: `Fehlende Tabellenblätter: ${missingSheets.join(', ')}`,
                code: 'MISSING_SHEETS',
              },
              {
                sheet: null,
                row: null,
                field: null,
                message: `Erwartete Tabellenblätter: ${requiredSheets.join(', ')}`,
                code: 'EXPECTED_SHEETS',
              },
            ],
          });
        }

        // Parse Wahlen sheet (election metadata) - horizontal table format
        const infoSheet = workbook.Sheets[EXPECTED_SHEET_NAMES.INFO];
        const infoRows = XLSX.utils.sheet_to_json(infoSheet, {
          defval: '',
          raw: false,
        });

        // Take first row as election data (header is automatically mapped by xlsx)
        const info = infoRows.length > 0 ? infoRows[0] : {};

        // Parse Listenvorlage sheet (candidates)
        const candidatesSheet = workbook.Sheets[EXPECTED_SHEET_NAMES.CANDIDATES];
        const candidatesRaw = XLSX.utils.sheet_to_json(candidatesSheet, {
          defval: '',
          raw: false,
        });

        // Convert Nr to integers
        const candidates = candidatesRaw.map((row) => ({
          ...row,
          Nr: row.Nr ? parseInt(row.Nr, 10) : null,
        }));

        // Check if info sheet is empty
        if (Object.keys(info).length === 0) {
          return resolve({
            success: false,
            errors: [
              {
                sheet: EXPECTED_SHEET_NAMES.INFO,
                row: null,
                field: null,
                message: `Das Tabellenblatt "${EXPECTED_SHEET_NAMES.INFO}" enthält keine Daten`,
                code: 'EMPTY_SHEET',
              },
            ],
          });
        }

        // Note: Empty candidates list is allowed for referendums (Urabstimmungen)
        // Validation is handled by Zod schema in candidateListSchema

        resolve({
          success: true,
          data: {
            info,
            candidates,
          },
          sheets: actualSheets,
        });
      } catch (error) {
        resolve({
          success: false,
          errors: [
            {
              sheet: null,
              row: null,
              field: null,
              message: `Fehler beim Lesen der Excel-Datei: ${error.message}`,
              code: 'FILE_READ_ERROR',
            },
          ],
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        errors: [
          {
            sheet: null,
            row: null,
            field: null,
            message: 'Fehler beim Lesen der Datei. Bitte versuchen Sie es erneut.',
            code: 'FILE_READ_ERROR',
          },
        ],
      });
    };

    reader.readAsArrayBuffer(file);
  });
};
