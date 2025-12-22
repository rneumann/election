/* eslint-disable security/detect-object-injection */
import ExcelJS from 'exceljs';
import { EXPECTED_SHEET_NAMES } from '../../schemas/election.schema.js';
import { logger } from '../../conf/logger/logger.js';

/**
 * Parse Excel file containing election configuration.
 * @param {File} file - The Excel file to parse.
 * @returns {Promise<{success: boolean, data?: {info: Object, candidates: Array}, sheets?: Array, errors?: Array}>}
 */
export const parseElectionExcel = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

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
        ],
      };
    }

    const infoSheet = workbook.getWorksheet(EXPECTED_SHEET_NAMES.INFO);
    const candidatesSheet = workbook.getWorksheet(EXPECTED_SHEET_NAMES.CANDIDATES);

    // Parse multiple elections (columns) from Info sheet
    const elections = [];
    let headerRow = null;
    let headerRowIndex = null;
    let startDate = null;
    let endDate = null;

    // Find the header row (contains "Wahl Kennung" or "Kennung")
    infoSheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        const val = cell.value ? String(cell.value).trim() : '';
        if (val === 'Wahlzeitraum von') {
          startDate = row.getCell(cell.col + 2).value;
        }
        if (val === 'bis') {
          endDate = row.getCell(cell.col + 2).value;
        }
        if ((val === 'Kennung' || val === 'Wahl Kennung') && !headerRow) {
          headerRow = row;
          headerRowIndex = rowNumber;
        }
      });
    });

    if (!headerRow) {
      return {
        success: false,
        errors: [
          {
            sheet: EXPECTED_SHEET_NAMES.INFO,
            row: null,
            field: 'Kennung',
            message: `Konnte Kopfzeile 'Kennung' im Blatt '${EXPECTED_SHEET_NAMES.INFO}' nicht finden.`,
            code: 'HEADER_MISSING',
          },
        ],
      };
    }

    // Build header map
    const headers = {};
    headerRow.eachCell((cell, colNumber) => {
      const headerName = String(cell.value || '').trim();
      if (headerName) {
        headers[colNumber] = headerName;
      }
    });

    // Parse ALL data rows after the header (each row is one election)
    for (let rowNum = headerRowIndex + 1; rowNum <= infoSheet.rowCount; rowNum++) {
      const row = infoSheet.getRow(rowNum);
      const election = {};
      let hasData = false;

      row.eachCell((cell, colNumber) => {
        const headerName = headers[colNumber];
        if (headerName) {
          let value = cell.value;
          if (value && typeof value === 'object' && value.result !== undefined) {
            value = value.result;
          }
          if (value !== null && value !== undefined && String(value).trim() !== '') {
            election[headerName] = value;
            hasData = true;
          }
        }
      });

      // Only add election if it has a Kennung
      if (hasData && (election['Kennung'] || election['Wahl Kennung'])) {
        if (startDate) election['Startzeitpunkt'] = startDate;
        if (endDate) election['Endzeitpunkt'] = endDate;
        elections.push(election);
        logger.info(`Found election: ${election['Kennung'] || election['Wahl Kennung']}`);
      }
    }

    logger.info(`Total elections found: ${elections.length}`);
    const candidatesRaw = [];
    let candidateHeaders = [];

    candidatesSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.eachCell((cell) => candidateHeaders.push(cell.value ? String(cell.value).trim() : ''));
        return;
      }
      const rowData = {};
      let hasData = false;
      row.eachCell((cell, colNumber) => {
        const header = candidateHeaders[colNumber - 1];
        if (header) {
          let value = cell.value;
          if (value && typeof value === 'object' && value.result !== undefined) {
            value = value.result;
          }
          rowData[header] = value === null || value === undefined ? '' : String(value);
          if (String(value).trim() !== '') {
            hasData = true;
          }
        }
      });
      if (hasData) {
        candidatesRaw.push(rowData);
      }
    });

    const candidates = candidatesRaw.map((row) => ({
      ...row,
      Nr: row.Nr ? parseInt(row.Nr, 10) : null,
    }));

    if (elections.length === 0) {
      return {
        success: false,
        errors: [
          {
            sheet: EXPECTED_SHEET_NAMES.INFO,
            row: null,
            field: 'Kennung',
            message: `Keine Wahlen gefunden im Blatt '${EXPECTED_SHEET_NAMES.INFO}'.`,
            code: 'NO_ELECTIONS_FOUND',
          },
        ],
      };
    }

    return {
      success: true,
      data: { elections, candidates },
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
          message: `Excel Fehler: ${error.message}`,
          code: 'FILE_READ_ERROR',
        },
      ],
    };
  }
};
