import ExcelJS from 'exceljs';
import { EXPECTED_SHEET_NAMES } from '../../schemas/election.schema.js';

/**
 * Parse Excel file containing election configuration.
 */
export const parseElectionExcel = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // Sheets prüfen
    const actualSheets = workbook.worksheets.map((ws) => ws.name);
    const requiredSheets = [EXPECTED_SHEET_NAMES.INFO, EXPECTED_SHEET_NAMES.CANDIDATES];
    const missingSheets = requiredSheets.filter((sheet) => !actualSheets.includes(sheet));

    if (missingSheets.length > 0) {
      return {
        success: false,
        errors: [
          {
            message: `Fehlende Tabellenblätter: ${missingSheets.join(', ')}`,
            code: 'MISSING_SHEETS',
          },
        ],
      };
    }

    const infoSheet = workbook.getWorksheet(EXPECTED_SHEET_NAMES.INFO);
    const candidatesSheet = workbook.getWorksheet(EXPECTED_SHEET_NAMES.CANDIDATES);

    // --- PARSE WAHLEN SHEET (Metadaten) ---
    // Wir suchen dynamisch nach der Kopfzeile und den Datumsfeldern

    let infoHeaders = {}; // Map: SpaltenIndex -> Name (z.B. 7 -> "Wahltyp")
    let infoDataRow = null;
    let startDate = null;
    let endDate = null;

    infoSheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        const val = cell.value ? String(cell.value).trim() : '';

        // 1. Datum suchen (steht oft oben links/rechts)
        if (val === 'Wahlzeitraum von') startDate = row.getCell(colNumber + 2).value; // Annahme: Wert steht 2 Spalten weiter
        if (val === 'bis') endDate = row.getCell(colNumber + 2).value;

        // 2. Kopfzeile finden (Zeile beginnt mit Kennung oder Wahl Kennung)
        if (val === 'Kennung' || val === 'Wahl Kennung') {
          // Header-Zeile gefunden! Alle Spaltennamen speichern
          row.eachCell((headerCell, headerCol) => {
            const headerName = String(headerCell.value).trim();
            // eslint-disable-next-line security/detect-object-injection
            if (headerName) infoHeaders[headerCol] = headerName;
          });

          // Die eigentlichen DATEN stehen direkt in der Zeile darunter
          const dataRow = infoSheet.getRow(rowNumber + 1);
          if (dataRow) {
            infoDataRow = {};
            dataRow.eachCell((dataCell, dataCol) => {
              // eslint-disable-next-line security/detect-object-injection
              const key = infoHeaders[dataCol]; // Wir nutzen den Namen aus dem Header, nicht den Index!
              if (key) {
                let value = dataCell.value;
                if (value && typeof value === 'object' && value.result !== undefined)
                  value = value.result;
                // eslint-disable-next-line security/detect-object-injection
                infoDataRow[key] = value;
              }
            });
          }
        }
      });
    });

    const info = infoDataRow || {};
    // Datums-Fallback, falls nicht gefunden oder nicht gesetzt
    if (startDate) info['Startzeitpunkt'] = startDate;
    if (endDate) info['Endzeitpunkt'] = endDate;

    // --- PARSE LISTENVORLAGE SHEET (Kandidaten) ---
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
          if (value && typeof value === 'object' && value.result !== undefined)
            value = value.result;
          // eslint-disable-next-line security/detect-object-injection
          rowData[header] = value === null || value === undefined ? '' : String(value);
          if (String(value).trim() !== '') hasData = true;
        }
      });
      if (hasData) candidatesRaw.push(rowData);
    });

    const candidates = candidatesRaw.map((row) => ({
      ...row,
      Nr: row.Nr ? parseInt(row.Nr, 10) : null,
    }));

    if (Object.keys(info).length === 0) {
      return {
        success: false,
        errors: [
          {
            message: `Konnte Kopfzeile 'Kennung' im Blatt '${EXPECTED_SHEET_NAMES.INFO}' nicht finden.`,
            code: 'HEADER_MISSING',
          },
        ],
      };
    }

    return {
      success: true,
      data: { info, candidates },
      sheets: actualSheets,
    };
  } catch (error) {
    return {
      success: false,
      errors: [{ message: `Excel Fehler: ${error.message}`, code: 'FILE_READ_ERROR' }],
    };
  }
};
