import ExcelJS from 'exceljs';

/**
 * Creates an Excel workbook and a worksheet, adds header + rows.
 *
 * @param {string} sheetName
 * @param {string[]} header
 * @param {Array<Array<any>>} rows
 * @returns {ExcelJS.Workbook}
 */
export function createBasicWorkbook(sheetName, header, rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  if (header) sheet.addRow(header);
  if (rows?.length) rows.forEach((r) => sheet.addRow(r));

  return workbook;
}

/**
 * Writes an Excel workbook to the Express response object.
 *
 * @param {ExcelJS.Workbook} workbook
 * @param {import('express').Response} res
 * @param {string} filename
 */
export async function streamWorkbook(workbook, res, filename) {
  res.setHeader('Content-Type', EXCEL_MIME_TYPE);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  await workbook.xlsx.write(res);
  res.end();
}

export const EXCEL_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
