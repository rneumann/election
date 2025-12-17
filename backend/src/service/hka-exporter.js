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

// Spalten-Indizes (vermeidet Magic Numbers)
const COL_IDX_LABEL = 1; // Spalte A
const COL_IDX_VALUE = 2; // Spalte B
const COL_IDX_VOTES = 3; // Spalte C
const COL_IDX_STATUS = 4; // Spalte D
const COL_IDX_PERCENT = 5; // Spalte E
const COL_IDX_SIGN_LEFT = 1; // Spalte A (Unterschrift)
const COL_IDX_SIGN_RIGHT = 4; // Spalte D (Unterschrift)

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
 * Getrennt vom normalen Export, um bestehende Logik nicht zu stören.
 *
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

    // 3. Logo einfügen (Fehlertolerant)
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
      // Fix: 'err' statt 'e' nutzen und loggen
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

    // 5. Metadaten Block
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
      r.getCell(COL_IDX_LABEL).font = { bold: true };
      r.getCell(COL_IDX_VALUE).value = val;

      // Grauer Hintergrund für den Block
      for (let i = COL_START; i <= COL_END; i += 1) {
        r.getCell(i).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLORS.BG_METADATA },
        };
      }
      rowNum += 1;
    });
    rowNum += 2;

    // 6. Ergebnisse
    const headRow = sheet.getRow(rowNum);
    const typeLower = result.election_type ? result.election_type.toLowerCase() : '';
    const isReferendum = typeLower.includes('referendum') || typeLower.includes('urabstimmung');

    const headers = isReferendum
      ? ['Option', 'Stimmen', 'Prozent', 'Status', '']
      : ['Platz/Liste', 'Kandidat:in', 'Stimmen', 'Status', 'Prozent'];

    headers.forEach((h, i) => {
      // Fix: Curly Braces hinzugefügt
      if (!h) {
        return;
      }
      const cell = headRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: COLORS.WHITE } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.BG_HEADER },
      };
      cell.alignment = { horizontal: 'center' };
    });
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

      if (isReferendum) {
        // Referendum Zeile
        r.getCell(COL_IDX_LABEL).value = c.option;
        r.getCell(COL_IDX_VALUE).value = c.votes;
        r.getCell(COL_IDX_VOTES).value = c.percentage ? `${c.percentage}%` : '-';
        // Fix: Magic Number 4 -> COL_IDX_STATUS
        r.getCell(COL_IDX_STATUS).value = c.status;

        // Grün markieren wenn Angenommen
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
        // Personenwahl Zeile
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

        // Fix: Magic Numbers 4 & 5 ersetzt
        r.getCell(COL_IDX_STATUS).value = status;
        r.getCell(COL_IDX_PERCENT).value = c.percentage ? `${c.percentage}%` : '';

        // Zeilenfarbe setzen
        if (color) {
          for (let i = COL_START; i <= COL_END; i += 1) {
            r.getCell(i).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: color },
            };
          }
        }
      }

      // Rahmen für alle Zellen
      for (let i = COL_START; i <= COL_END; i += 1) {
        r.getCell(i).border = {
          bottom: { style: 'dotted', color: { argb: COLORS.BORDER_GREY } },
        };
      }
      rowNum += 1;
    });

    rowNum += 3;

    // 7. Unterschriften
    const signRow = sheet.getRow(rowNum);
    // Fix: Magic Numbers durch Konstanten ersetzt
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
