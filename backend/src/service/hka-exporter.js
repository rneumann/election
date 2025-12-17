import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import { logger } from '../conf/logger/logger.js';
import { client } from '../database/db.js';

// Setup für Dateipfade
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// HKA Corporate Colors
const COLORS = {
  HKA_RED: 'FFE2001A',
  HKA_BLACK: 'FF333333',
  WHITE: 'FFFFFFFF',
  BG_HEADER: 'FFE2001A',
  BG_METADATA: 'FFF5F5F5',
  BG_SUCCESS: 'FFD4EDDA',
  BG_WARNING: 'FFFFF4E6',
};

/*
 * Generiert das offizielle Wahlergebnis (HKA Design)
 * Getrennt vom normalen Export, um bestehende Logik nicht zu stören.
 */
export const generateOfficialReport = async (resultId) => {
  const db = await client.connect();

  try {
    // 1. Daten laden (Gleiche Query wie im Original, aber isoliert)
    const query = `
      SELECT 
        er.result_data, er.counted_at, er.is_final, er.version,
        e.info as election_name, e.description, e.election_type, 
        e.counting_method, e.seats_to_fill, e.start, e."end",
        COUNT(b.id) as total_ballots,
        COUNT(b.id) FILTER (WHERE b.valid = TRUE) as valid_ballots,
        COUNT(b.id) FILTER (WHERE b.valid = FALSE) as invalid_ballots
      FROM election_results er
      JOIN elections e ON er.election_id = e.id
      LEFT JOIN ballots b ON b.election = e.id
      WHERE er.id = $1
      GROUP BY er.id, e.id
    `;

    const { rows } = await db.query(query, [resultId]);
    if (rows.length === 0) throw new Error('Ergebnis nicht gefunden');

    const result = rows[0];
    const data = result.result_data;

    // 2. Excel erstellen
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Amtliches Ergebnis');

    // Spaltenbreiten
    sheet.columns = [{ width: 25 }, { width: 35 }, { width: 15 }, { width: 25 }, { width: 15 }];

    // 3. Logo einfügen (Fehlertolerant)
    try {
      const logoId = workbook.addImage({
        filename: path.join(__dirname, '../assets/hka_logo.png'),
        extension: 'png',
      });
      sheet.addImage(logoId, {
        tl: { col: 0, row: 0 },
        ext: { width: 180, height: 55 },
      });
    } catch (e) {
      logger.warn('HKA Logo nicht gefunden - Export läuft ohne Logo weiter.');
    }

    let rowNum = 5;

    // 4. Titel & Header
    const titleRow = sheet.getRow(rowNum);
    sheet.mergeCells(`A${rowNum}:E${rowNum}`);
    titleRow.getCell(1).value = 'AMTLICHES WAHLERGEBNIS';
    titleRow.getCell(1).font = {
      name: 'Arial',
      size: 16,
      bold: true,
      color: { argb: COLORS.HKA_RED },
    };
    titleRow.getCell(1).alignment = { horizontal: 'center' };
    titleRow.getCell(1).border = { bottom: { style: 'thick', color: { argb: COLORS.HKA_RED } } };
    rowNum += 2;

    // 5. Metadaten Block
    const infos = [
      ['Wahlbezeichnung:', result.election_name],
      ['Wahlart:', result.election_type],
      ['Sitze:', result.seats_to_fill],
      [
        'Zeitraum:',
        `${new Date(result.start).toLocaleDateString()} - ${new Date(result.end).toLocaleDateString()}`,
      ],
      ['Status:', result.is_final ? 'FINAL' : 'VORLÄUFIG'],
    ];

    infos.forEach(([key, val]) => {
      const r = sheet.getRow(rowNum++);
      r.getCell(1).value = key;
      r.getCell(1).font = { bold: true };
      r.getCell(2).value = val;
      // Grauer Hintergrund für den Block
      for (let i = 1; i <= 5; i++)
        r.getCell(i).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLORS.BG_METADATA },
        };
    });
    rowNum += 2;

    // 6. Ergebnisse
    const headRow = sheet.getRow(rowNum++);
    ['Platz/Liste', 'Kandidat:in', 'Stimmen', 'Status', 'Prozent'].forEach((h, i) => {
      const cell = headRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: COLORS.WHITE } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.HKA_RED } };
      cell.alignment = { horizontal: 'center' };
    });

    // Kandidatenliste holen (Fallback für verschiedene JSON Strukturen)
    const candidates = data.allocation || data.all_candidates || data.elected || [];

    candidates.forEach((c) => {
      const r = sheet.getRow(rowNum++);
      r.getCell(1).value = c.listnum ? `Liste ${c.listnum}` : '-';
      r.getCell(2).value = `${c.firstname} ${c.lastname}`;
      r.getCell(3).value = c.votes;

      // Status & Farbe
      let status = 'Nicht gewählt';
      let color = null;

      if (c.seats > 0 || c.is_elected) {
        status = c.seats ? `${c.seats} Sitz(e)` : 'GEWÄHLT';
        color = COLORS.BG_SUCCESS;
      }
      if (c.is_tie) {
        status = 'STICHWAHL NÖTIG';
        color = COLORS.BG_WARNING;
      }

      r.getCell(4).value = status;
      r.getCell(5).value = c.percentage ? `${c.percentage}%` : '';

      if (color) {
        for (let i = 1; i <= 5; i++)
          r.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
      }
      // Rahmen
      for (let i = 1; i <= 5; i++)
        r.getCell(i).border = { bottom: { style: 'dotted', color: { argb: 'FFCCCCCC' } } };
    });

    rowNum += 3;

    // 7. Unterschriften
    sheet.getCell(`A${rowNum}`).value = 'Ort, Datum, Unterschrift Wahlleitung';
    sheet.getCell(`A${rowNum}`).border = { top: { style: 'thin' } };

    sheet.getCell(`D${rowNum}`).value = 'Ort, Datum, Unterschrift Wahlausschuss';
    sheet.getCell(`D${rowNum}`).border = { top: { style: 'thin' } };

    return await workbook.xlsx.writeBuffer();
  } finally {
    db.release();
  }
};
