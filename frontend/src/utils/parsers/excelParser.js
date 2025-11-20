import ExcelJS from 'exceljs';
import { EXPECTED_SHEET_NAMES } from '../../schemas/election.schema.js';

/**
 * Parse Excel file containing election configuration.
 * Uses ExcelJS library for secure reading of Excel files with multiple sheets.
 *
 * @param {File} file - Excel file to parse
 * @returns {Promise<{success: boolean, data?: Object, errors?: Array, sheets?: Array}>}
 * @throws {Error} If file reading fails
 */
export const parseElectionExcel = async (file) => {
  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Create workbook and load file
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // Check if all required sheets exist
    const actualSheets = workbook.worksheets.map((ws) => ws.name);
    const requiredSheets = [EXPECTED_SHEET_NAMES.INFO, EXPECTED_SHEET_NAMES.CANDIDATES];
    const missingSheets = requiredSheets.filter((sheet) => !actualSheets.includes(sheet));

    if (missingSheets.length > 0) {
      return {
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
      };
    }

    // Get worksheets
    const infoSheet = workbook.getWorksheet(EXPECTED_SHEET_NAMES.INFO);
    const candidatesSheet = workbook.getWorksheet(EXPECTED_SHEET_NAMES.CANDIDATES);

    // Parse Wahlen sheet (election metadata) - horizontal table format
    // ExcelJS: First row is header, data starts at row 2
    const infoRows = [];
    infoSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        return; // Skip header row
      }
      const rowData = {};
      row.eachCell((cell, colNumber) => {
        const header = infoSheet.getRow(1).getCell(colNumber).value;
        if (header) {
          // Convert cell value to string/number based on type
          let value = cell.value;
          if (value && typeof value === 'object' && value.result !== undefined) {
            value = value.result; // Handle formula cells
          }
          // eslint-disable-next-line security/detect-object-injection
          rowData[header] = value === null || value === undefined ? '' : String(value);
        }
      });
      if (Object.keys(rowData).length > 0) {
        infoRows.push(rowData);
      }
    });

    // Take first row as election data
    const info = infoRows.length > 0 ? infoRows[0] : {};

    // Parse Listenvorlage sheet (candidates)
    const candidatesRaw = [];
    let candidateHeaders = [];

    candidatesSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        // Get headers from first row
        row.eachCell((cell) => {
          candidateHeaders.push(cell.value || '');
        });
        return;
      }

      const rowData = {};
      row.eachCell((cell, colNumber) => {
        const header = candidateHeaders[colNumber - 1];
        if (header) {
          let value = cell.value;
          if (value && typeof value === 'object' && value.result !== undefined) {
            value = value.result;
          }
          // eslint-disable-next-line security/detect-object-injection
          rowData[header] = value === null || value === undefined ? '' : String(value);
        }
      });

      if (Object.keys(rowData).length > 0) {
        candidatesRaw.push(rowData);
      }
    });

    // Convert Nr to integers
    const candidates = candidatesRaw.map((row) => ({
      ...row,
      Nr: row.Nr ? parseInt(row.Nr, 10) : null,
    }));

    // Check if info sheet is empty
    if (Object.keys(info).length === 0) {
      return {
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
      };
    }

    // Note: Empty candidates list is allowed for referendums (Urabstimmungen)
    // Validation is handled by Zod schema in candidateListSchema

    return {
      success: true,
      data: {
        info,
        candidates,
      },
      sheets: actualSheets,
    };
  } catch (error) {
    return {
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
    };
  }
};
