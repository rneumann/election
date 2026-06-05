/**
 * Minimal ODS reader/writer.
 *
 * ODS (OpenDocument Spreadsheet) is a ZIP archive containing:
 *   - mimetype          (uncompressed, first entry)
 *   - META-INF/manifest.xml
 *   - content.xml       (the actual sheet data)
 *
 * Reading:  unzip → parse content.xml → normalised [{headerName: value}] per sheet
 * Writing:  build content.xml from sheet data → zip → stream to response
 */

import JSZip from 'jszip';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import fs from 'fs/promises';
import { logger } from '../conf/logger/logger.js';

export const ODS_MIME_TYPE = 'application/vnd.oasis.opendocument.spreadsheet';
const ODS_EXTENSION = '.ods';

// ─── READING ────────────────────────────────────────────────────────────────

/**
 * Reads an ODS file and returns its sheets as arrays of row objects.
 *
 * @param {string} filePath
 * @returns {Promise<Record<string, Record<string, string>[]>>}
 *   Map of sheetName → array of row objects keyed by column header
 */
export const readOdsSheets = async (filePath) => {
  const buffer = await fs.readFile(filePath);
  const zip = await JSZip.loadAsync(buffer);

  const contentXml = await zip.file('content.xml')?.async('string');
  if (!contentXml) {
    throw new Error('Ungültige ODS-Datei: content.xml fehlt');
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) =>
      ['table:table', 'table:table-row', 'table:table-cell', 'text:p'].includes(name),
  });

  const doc = parser.parse(contentXml);
  const spreadsheet =
    doc?.['office:document-content']?.['office:body']?.['office:spreadsheet'];

  if (!spreadsheet) {
    throw new Error('Kein Spreadsheet-Inhalt in der ODS-Datei gefunden');
  }

  const tables = spreadsheet['table:table'] ?? [];
  const result = {};

  for (const table of tables) {
    const sheetName = table['@_table:name'] ?? 'Tabelle';
    const rows = table['table:table-row'] ?? [];
    const allRows = [];

    for (const row of rows) {
      const cells = row['table:table-cell'] ?? [];
      const values = [];

      for (const cell of cells) {
        // Wiederholte leere Zellen expandieren
        const repeat = parseInt(cell['@_table:number-columns-repeated'] ?? '1', 10);
        const textNodes = cell['text:p'];
        const rawVal = Array.isArray(textNodes)
          ? textNodes.map((t) => (typeof t === 'string' ? t : t?.['#text'] ?? '')).join('')
          : typeof textNodes === 'string'
            ? textNodes
            : (textNodes?.['#text'] ?? '');
        const val = rawVal ?? '';

        for (let i = 0; i < Math.min(repeat, 50); i++) {
          values.push(val);
        }
      }

      allRows.push(values);
    }

    // Erste nicht-leere Zeile als Header verwenden
    const headerIdx = allRows.findIndex((r) => r.some((v) => v !== ''));
    if (headerIdx === -1) continue;

    const headers = allRows[headerIdx];
    // rawRows: alle Zeilen vor dem Header (z.B. Meta-Informationen)
    const rawRows = allRows.slice(0, headerIdx);
    const dataRows = [];

    for (let i = headerIdx + 1; i < allRows.length; i++) {
      const row = allRows[i];
      if (row.every((v) => v === '')) continue;
      const obj = {};
      headers.forEach((h, idx) => {
        if (h) obj[h] = row[idx] ?? '';
      });
      dataRows.push(obj);
    }

    result[sheetName] = { headers, rawRows, dataRows };
  }

  return result;
};

// ─── WRITING ────────────────────────────────────────────────────────────────

/**
 * Builds an ODS file from a list of sheets and streams it to the response.
 *
 * @param {Array<{name: string, headers: string[], rows: any[][]}>} sheets
 * @param {import('express').Response} res
 * @param {string} filename
 */
export const streamOdsFile = async (sheets, res, filename) => {
  const contentXml = buildContentXml(sheets);

  const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0">
  <manifest:file-entry manifest:media-type="${ODS_MIME_TYPE}" manifest:full-path="/"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="content.xml"/>
</manifest:manifest>`;

  const zip = new JSZip();
  zip.file('mimetype', ODS_MIME_TYPE, { compression: 'STORE' });
  zip.folder('META-INF').file('manifest.xml', manifestXml);
  zip.file('content.xml', contentXml);

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

  res.setHeader('Content-Type', ODS_MIME_TYPE);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.end(buffer);
};

// ─── HELPERS ────────────────────────────────────────────────────────────────

const escapeXml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const buildCell = (value) => {
  const v = escapeXml(value);
  return `<table:table-cell office:value-type="string"><text:p>${v}</text:p></table:table-cell>`;
};

const buildRow = (cells) =>
  `<table:table-row>${cells.map(buildCell).join('')}</table:table-row>`;

const buildSheet = ({ name, headers, rows, metaRows }) => {
  // optionale Meta-Zeilen vor dem Header (z.B. Wahlzeitraum)
  const metaPart = metaRows ? metaRows.map(buildRow).join('') : '';
  const headerRow = buildRow(headers);
  const dataRows = rows.map(buildRow).join('');
  return `<table:table table:name="${escapeXml(name)}">${metaPart}${headerRow}${dataRows}</table:table>`;
};

const buildContentXml = (sheets) => `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  office:version="1.3">
  <office:body>
    <office:spreadsheet>
      ${sheets.map(buildSheet).join('\n      ')}
    </office:spreadsheet>
  </office:body>
</office:document-content>`;

/**
 * Returns true if the filename or MIME type indicates an ODS file.
 * @param {string} filename
 * @param {string} [mimetype]
 */
export const isOdsFile = (filename, mimetype) =>
  filename?.toLowerCase().endsWith(ODS_EXTENSION) || mimetype === ODS_MIME_TYPE;

logger.debug('ods.js loaded');
