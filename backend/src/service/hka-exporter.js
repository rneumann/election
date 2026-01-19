import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import { logger } from '../conf/logger/logger.js';
import { client } from '../database/db.js';

// Setup für Dateipfade
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- KONSTANTEN: FARBEN ---
const COLORS = {
  HKA_RED: 'FFE2001A',
  HKA_BLACK: 'FF333333',
  WHITE: 'FFFFFFFF',
  BG_HEADER: 'FFE2001A',
  BG_METADATA: 'FFF5F5F5',
  BG_STATS: 'FFEAF2F8', // Helles Blau für Statistik
  BG_SUCCESS: 'FFD4EDDA',
  BG_WARNING: 'FFFFF4E6',
  BORDER_GREY: 'FFCCCCCC',
};

// --- KONSTANTEN: LAYOUT & DIMENSIONEN ---
const COL_WIDTH_A = 25;
const COL_WIDTH_B = 35;
const COL_WIDTH_C = 15;
const COL_WIDTH_D = 25;
const COL_WIDTH_E = 15;

const LOGO_WIDTH = 180;
const LOGO_HEIGHT = 55;
const START_ROW = 5;
const FONT_SIZE_TITLE = 16;
const COL_START = 1;
const COL_END = 5;

// Spalten-Indizes
const COL_IDX_LABEL = 1;
const COL_IDX_VALUE = 2;
const COL_IDX_VOTES = 3;
const COL_IDX_STATUS = 4;
const COL_IDX_PERCENT = 5;
const COL_IDX_SIGN_LEFT = 1;
const COL_IDX_SIGN_RIGHT = 4;

// --- KONSTANTEN: TEXTE ---
const TEXT_TITLE = 'AMTLICHES WAHLERGEBNIS';
const TEXT_FINAL = 'FINAL';
const TEXT_DRAFT = 'VORLÄUFIG';
const TEXT_YES = 'JA';
const TEXT_NO = 'NEIN';
const TEXT_ABSTAIN = 'Enthaltung';
const TEXT_ACCEPTED = 'Angenommen';
const TEXT_REJECTED = 'Abgelehnt';
const STATUS_ELECTED = 'GEWÄHLT';
const STATUS_NOT_ELECTED = 'Nicht gewählt';
const STATUS_TIE = 'STICHWAHL NÖTIG';

// --- LOGIK KONSTANTEN ---
const RESULT_ACCEPTED = 'ACCEPTED';
const RESULT_REJECTED = 'REJECTED';

/**
 * Generiert das offizielle Wahlergebnis (HKA Design).
 * @param {string} resultId - Die ID des Wahlergebnisses
 * @returns {Promise<Buffer>} Der Excel-Datei-Buffer
 */
export const generateOfficialReport = async (resultId) => {
  const db = await client.connect();

  try {
    // 1. Daten laden
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
    if (rows.length === 0) {
      throw new Error('Ergebnis nicht gefunden');
    }

    const result = rows[0];
    const data = result.result_data;

    // 2. Excel erstellen
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'HKA E-Voting System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Amtliches Ergebnis');

    // Spaltenbreiten
    sheet.columns = [
      { width: COL_WIDTH_A },
      { width: COL_WIDTH_B },
      { width: COL_WIDTH_C },
      { width: COL_WIDTH_D },
      { width: COL_WIDTH_E },
    ];

    // 3. Logo einfügen
    try {
      const logoId = workbook.addImage({
        filename: path.join(__dirname, '../assets/hka_logo.png'),
        extension: 'png',
      });
      sheet.addImage(logoId, {
        tl: { col: 0, row: 0 },
        ext: { width: LOGO_WIDTH, height: LOGO_HEIGHT },
      });
    } catch (err) {
      logger.warn('HKA Logo nicht gefunden - Export läuft ohne Logo weiter.', err.message);
    }

    let rowNum = START_ROW;

    // 4. Titel & Header
    const titleRow = sheet.getRow(rowNum);
    sheet.mergeCells(`A${rowNum}:E${rowNum}`);
    const titleCell = titleRow.getCell(COL_IDX_LABEL);
    titleCell.value = TEXT_TITLE;
    titleCell.font = {
      name: 'Arial',
      size: FONT_SIZE_TITLE,
      bold: true,
      color: { argb: COLORS.HKA_RED },
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.border = {
      bottom: { style: 'thick', color: { argb: COLORS.HKA_RED } },
    };
    rowNum += 2;

    // 5. Metadaten Block (Infos zur Wahl)
    const infos = [
      ['Wahlbezeichnung:', result.election_name],
      ['Wahlart:', result.election_type],
      ['Sitze:', result.seats_to_fill],
      [
        'Zeitraum:',
        `${new Date(result.start).toLocaleDateString()} - ${new Date(result.end).toLocaleDateString()}`,
      ],
      ['Status:', result.is_final ? TEXT_FINAL : TEXT_DRAFT],
    ];

    infos.forEach(([key, val]) => {
      const r = sheet.getRow(rowNum);
      r.getCell(COL_IDX_LABEL).value = key;
      r.getCell(COL_IDX_LABEL).font = { bold: true, name: 'Arial', size: 11 };
      r.getCell(COL_IDX_VALUE).value = val;
      r.getCell(COL_IDX_VALUE).font = { name: 'Arial', size: 11 };
      r.height = 20;

      for (let i = COL_START; i <= COL_END; i += 1) {
        r.getCell(i).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLORS.BG_METADATA },
        };
        r.getCell(i).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        r.getCell(i).border = {
          top: { style: 'thin', color: { argb: COLORS.BORDER_GREY } },
          bottom: { style: 'thin', color: { argb: COLORS.BORDER_GREY } },
          left: { style: 'thin', color: { argb: COLORS.BORDER_GREY } },
          right: { style: 'thin', color: { argb: COLORS.BORDER_GREY } },
        };
      }
      rowNum += 1;
    });
    rowNum += 1; // Kleiner Abstand

    // --- 6. Statistik / Wahlbeteiligung ---
    // Berechnung der Quote
    const total = parseInt(result.total_ballots, 10) || 0;
    const valid = parseInt(result.valid_ballots, 10) || 0;
    const invalid = parseInt(result.invalid_ballots, 10) || 0;
    const rate = total > 0 ? ((valid / total) * 100).toFixed(2) : '0.00';

    const statsHeader = sheet.getRow(rowNum);
    statsHeader.getCell(COL_IDX_LABEL).value = 'STATISTIK';
    statsHeader.getCell(COL_IDX_LABEL).font = { bold: true, color: { argb: COLORS.HKA_RED } };
    rowNum += 1;

    const stats = [
      ['Abgegebene Stimmen (Gesamt):', total],
      ['Gültige Stimmen:', valid],
      ['Ungültige Stimmen:', invalid],
      ['Gültigkeitsquote:', `${rate}%`],
    ];

    stats.forEach(([key, val]) => {
      const r = sheet.getRow(rowNum);
      r.getCell(COL_IDX_LABEL).value = key;
      r.getCell(COL_IDX_LABEL).font = { bold: true, name: 'Arial', size: 11 };
      r.getCell(COL_IDX_LABEL).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      r.getCell(COL_IDX_VALUE).value = val;
      r.getCell(COL_IDX_VALUE).font = { name: 'Arial', size: 11 };
      r.getCell(COL_IDX_VALUE).alignment = { vertical: 'middle', horizontal: 'center' };
      r.height = 20;

      // Leichter blauer Hintergrund für Statistik
      for (let i = COL_START; i <= COL_END; i += 1) {
        r.getCell(i).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLORS.BG_STATS },
        };
        r.getCell(i).border = {
          top: { style: 'thin', color: { argb: COLORS.BORDER_GREY } },
          bottom: { style: 'thin', color: { argb: COLORS.BORDER_GREY } },
          left: { style: 'thin', color: { argb: COLORS.BORDER_GREY } },
          right: { style: 'thin', color: { argb: COLORS.BORDER_GREY } },
        };
        r.getCell(i).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      }
      rowNum += 1;
    });
    rowNum += 2; // Abstand vor Ergebnissen

    // 7. Ergebnisse (Kandidaten / Referendum)
    const headRow = sheet.getRow(rowNum);
    const typeLower = result.election_type ? result.election_type.toLowerCase() : '';
    const isReferendum = typeLower.includes('referendum') || typeLower.includes('urabstimmung');

    const headers = isReferendum
      ? ['Option', 'Stimmen', 'Prozent', 'Status', '']
      : ['Platz/Liste', 'Kandidat:in', 'Stimmen', 'Status', 'Prozent'];

    headers.forEach((h, i) => {
      if (!h) {
        return;
      }
      const cell = headRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: COLORS.WHITE }, name: 'Arial', size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.BG_HEADER },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: COLORS.HKA_BLACK } },
        bottom: { style: 'thin', color: { argb: COLORS.HKA_BLACK } },
        left: { style: 'thin', color: { argb: COLORS.HKA_BLACK } },
        right: { style: 'thin', color: { argb: COLORS.HKA_BLACK } },
      };
    });
    headRow.height = 25;
    rowNum += 1;

    // Kandidatenliste holen
    let candidates = data.allocation || data.all_candidates || data.elected || [];

    // Daten mappen falls Referendum
    if (isReferendum && data.yes_votes !== undefined) {
      candidates = [
        {
          option: TEXT_YES,
          votes: data.yes_votes,
          percentage: data.yes_percentage,
          status: data.result === RESULT_ACCEPTED ? TEXT_ACCEPTED : '-',
        },
        {
          option: TEXT_NO,
          votes: data.no_votes,
          percentage: data.no_percentage,
          status: data.result === RESULT_REJECTED ? TEXT_REJECTED : '-',
        },
        {
          option: TEXT_ABSTAIN,
          votes: data.abstain_votes,
          percentage: data.abstain_percentage,
          status: '-',
        },
      ];
    }

    candidates.forEach((c) => {
      const r = sheet.getRow(rowNum);

      // --- WERTE & FARBEN SETZEN ---
      if (isReferendum) {
        r.getCell(COL_IDX_LABEL).value = c.option;
        r.getCell(COL_IDX_VALUE).value = c.votes;
        r.getCell(COL_IDX_VOTES).value = c.percentage ? `${c.percentage}%` : '-';
        r.getCell(COL_IDX_STATUS).value = c.status;

        if (c.option === TEXT_YES && data.result === RESULT_ACCEPTED) {
          for (let i = COL_START; i <= COL_END; i += 1) {
            r.getCell(i).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: COLORS.BG_SUCCESS },
            };
          }
        }
      } else {
        r.getCell(COL_IDX_LABEL).value = c.listnum ? `Liste ${c.listnum}` : '-';
        r.getCell(COL_IDX_VALUE).value = `${c.firstname} ${c.lastname}`;
        r.getCell(COL_IDX_VOTES).value = c.votes;

        let status = STATUS_NOT_ELECTED;
        let color = null;

        if (c.seats > 0 || c.is_elected) {
          status = c.seats ? `${c.seats} Sitz(e)` : STATUS_ELECTED;
          color = COLORS.BG_SUCCESS;
        }
        if (c.is_tie) {
          status = STATUS_TIE;
          color = COLORS.BG_WARNING;
        }

        r.getCell(COL_IDX_STATUS).value = status;
        r.getCell(COL_IDX_PERCENT).value = c.percentage ? `${c.percentage}%` : '';

        if (color) {
          for (let i = COL_START; i <= COL_END; i += 1) {
            r.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
          }
        }
      }

      // --- AUSRICHTUNG (ALIGNMENT) ---
      // 1. Spalte A (Liste/Option): Links + Einzug
      r.getCell(COL_IDX_LABEL).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

      // 2. Restliche Spalten je nach Wahltyp
      if (isReferendum) {
        // Bei Referendum sind Zahlen in Spalte B, C und Status in D -> alles zentrieren
        r.getCell(COL_IDX_VALUE).alignment = { vertical: 'middle', horizontal: 'center' };
        r.getCell(COL_IDX_VOTES).alignment = { vertical: 'middle', horizontal: 'center' };
        r.getCell(COL_IDX_STATUS).alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        // Bei Wahl: Kandidat links, Stimmen/Prozent/Status zentriert
        r.getCell(COL_IDX_VALUE).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        r.getCell(COL_IDX_VOTES).alignment = { vertical: 'middle', horizontal: 'center' };
        r.getCell(COL_IDX_STATUS).alignment = { vertical: 'middle', horizontal: 'center' };
        r.getCell(COL_IDX_PERCENT).alignment = { vertical: 'middle', horizontal: 'center' };
      }

      // --- SCHRIFTEN & RÄNDER ---
      for (let i = COL_START; i <= COL_END; i += 1) {
        const cell = r.getCell(i);
        cell.font = { name: 'Arial', size: 11 };
        cell.border = {
          top: { style: 'thin', color: { argb: COLORS.BORDER_GREY } },
          bottom: { style: 'thin', color: { argb: COLORS.BORDER_GREY } },
          left: { style: 'thin', color: { argb: COLORS.BORDER_GREY } },
          right: { style: 'thin', color: { argb: COLORS.BORDER_GREY } },
        };
      }
      r.height = 22;

      rowNum += 1;
    });

    rowNum += 3;

    // 8. Unterschriften
    const signRow = sheet.getRow(rowNum);
    signRow.getCell(COL_IDX_SIGN_LEFT).value = 'Ort, Datum, Unterschrift Wahlleitung';
    signRow.getCell(COL_IDX_SIGN_LEFT).border = { top: { style: 'thin' } };

    signRow.getCell(COL_IDX_SIGN_RIGHT).value = 'Ort, Datum, Unterschrift Wahlausschuss';
    signRow.getCell(COL_IDX_SIGN_RIGHT).border = { top: { style: 'thin' } };

    return await workbook.xlsx.writeBuffer();
  } catch (err) {
    logger.error('Error generating official report:', err);
    throw err;
  } finally {
    db.release();
  }
};
