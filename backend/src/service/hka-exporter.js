import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../conf/logger/logger.js';
import { client } from '../database/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Farben ──────────────────────────────────────────────────────────────────
const HKA_RED  = '#E2001A';
const DARK     = '#333333';
const GREY_BG  = '#F5F5F5';
const BLUE_BG  = '#EAF2F8';
const GREEN_BG = '#D4EDDA';
const CAND_BG  = '#E8F5E9';
const YELLOW_BG= '#FFF4E6';
const LIST_BG  = '#E0E0E0';
const BORDER   = '#CCCCCC';
const WHITE    = '#FFFFFF';

// ── Seitenmaße (A4 in pt) ───────────────────────────────────────────────────
const MARGIN     = 50;
const PAGE_W     = 595.28;
const PAGE_H     = 841.89;
const CONTENT_W  = PAGE_W - MARGIN * 2;

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' }) : '-';

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin',
  }) : '-';

const labelElectionType = (t) =>
  ({ majority_vote: 'Mehrheitswahl', proportional_representation: 'Verhältniswahl', referendum: 'Referendum' })[t] || t;

const labelMethod = (m) =>
  ({ sainte_lague: 'Sainte-Laguë', hare_niemeyer: 'Hare-Niemeyer',
     highest_votes_simple: 'Einfache Mehrheit', highest_votes_absolute: 'Absolute Mehrheit',
     yes_no_referendum: 'Ja/Nein/Enthaltung' })[m] || m;

/**
 * Zeichnet eine einfarbige Zeile mit Zellentext.
 * Setzt doc.y explizit auf y + h nach dem Rendern.
 */
const makeRowDrawer = (doc) => (cells, widths, opts = {}) => {
  const { bg = null, bold = false, color = DARK, h = 20, indent = 0 } = opts;

  if (doc.y + h > PAGE_H - MARGIN) doc.addPage();

  const y = doc.y;

  if (bg) doc.rect(MARGIN, y, CONTENT_W, h).fill(bg);

  let x = MARGIN + indent;
  cells.forEach((cell, i) => {
    const w = widths[i] - (i === 0 ? indent : 0);
    const text = cell === null || cell === undefined ? '' : String(cell);
    if (text) {
      doc
        .fontSize(9)
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fillColor(color)
        .text(text, x + 4, y + Math.max(1, (h - 10) / 2), { width: w - 8, lineBreak: false, ellipsis: true });
    }
    x += widths[i];
  });

  doc.rect(MARGIN, y, CONTENT_W, h).strokeColor(BORDER).lineWidth(0.5).stroke();
  doc.y = y + h;
};

/**
 * Zeichnet einen Schlüssel-Wert-Block (Metadaten / Statistik).
 */
const makeKvDrawer = (doc) => (key, value, bg = GREY_BG) => {
  const y = doc.y;
  const h = 20;
  doc.rect(MARGIN, y, CONTENT_W, h).fill(bg);
  doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK)
     .text(key, MARGIN + 6, y + 5, { width: 180, lineBreak: false });
  doc.fontSize(10).font('Helvetica').fillColor(DARK)
     .text(String(value ?? '-'), MARGIN + 192, y + 5, { width: CONTENT_W - 198, lineBreak: false });
  doc.rect(MARGIN, y, CONTENT_W, h).strokeColor(BORDER).lineWidth(0.5).stroke();
  doc.y = y + h;
};

/**
 * Zeichnet einen farbigen Abschnitts-Header.
 */
const makeSectionHeader = (doc) => (title) => {
  doc.moveDown(0.8);
  doc.fontSize(11).font('Helvetica-Bold').fillColor(HKA_RED).text(title);
  doc.moveDown(0.2);
};

// ── Hauptfunktion ────────────────────────────────────────────────────────────

/**
 * Generiert das amtliche Wahlergebnis als PDF.
 * @param {string} resultId - UUID des Wahlergebnisses
 * @returns {Promise<Buffer>} PDF als Buffer
 */
export const generateOfficialReport = async (resultId) => {
  const db = await client.connect();

  try {
    const { rows } = await db.query(
      `SELECT
         er.result_data, er.counted_at, er.is_final, er.version,
         e.info AS election_name, e.description, e.election_type,
         e.counting_method, e.seats_to_fill, e.start, e."end",
         COUNT(b.id)                                    AS total_ballots,
         COUNT(b.id) FILTER (WHERE b.valid = TRUE)      AS valid_ballots,
         COUNT(b.id) FILTER (WHERE b.valid = FALSE)     AS invalid_ballots,
         (SELECT COUNT(*) FROM votingnotes vn WHERE vn."electionid" = e.id) AS eligible_voters
       FROM election_results er
       JOIN elections e ON er.election_id = e.id
       LEFT JOIN ballots b ON b.election = e.id
       WHERE er.id = $1
       GROUP BY er.id, e.id`,
      [resultId],
    );

    if (rows.length === 0) throw new Error('Ergebnis nicht gefunden');

    const result = rows[0];
    const data   = result.result_data;
    const isProp = result.election_type === 'proportional_representation';
    const isRef  = result.election_type === 'referendum';

    // ── PDF-Dokument anlegen ─────────────────────────────────────────────────
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, autoFirstPage: true, info: {
      Title:   'Amtliches Wahlergebnis',
      Author:  'HKA E-Voting System',
      Subject: result.election_name,
    }});

    const bufPromise = new Promise((resolve, reject) => {
      const chunks = [];
      doc.on('data',  (c) => chunks.push(c));
      doc.on('end',   () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const row    = makeRowDrawer(doc);
    const kv     = makeKvDrawer(doc);
    const section = makeSectionHeader(doc);

    // ── Logo ─────────────────────────────────────────────────────────────────
    try {
      doc.image(path.join(__dirname, '../assets/HKA_Logo.png'), MARGIN, MARGIN, { height: 42 });
    } catch {
      logger.warn('HKA Logo nicht gefunden – PDF wird ohne Logo erstellt.');
    }

    // Status-Badge oben rechts
    const statusText  = result.is_final ? 'FINAL' : 'VORLÄUFIG';
    const statusColor = result.is_final ? '#28A745' : '#CC6600';
    doc.fontSize(10).font('Helvetica-Bold').fillColor(statusColor)
       .text(statusText, MARGIN, MARGIN + 14, { width: CONTENT_W, align: 'right' });

    // ── Titel ─────────────────────────────────────────────────────────────────
    doc.y = MARGIN + 58;
    doc.fontSize(18).font('Helvetica-Bold').fillColor(HKA_RED)
       .text('AMTLICHES WAHLERGEBNIS', { align: 'center' });
    doc.moveDown(0.25);
    const titleUnderY = doc.y;
    doc.moveTo(MARGIN, titleUnderY).lineTo(MARGIN + CONTENT_W, titleUnderY)
       .strokeColor(HKA_RED).lineWidth(2).stroke();
    doc.y = titleUnderY + 6;
    doc.moveDown(0.5);

    // ── Metadaten ─────────────────────────────────────────────────────────────
    section('WAHLANGABEN');
    kv('Wahlbezeichnung:',  result.election_name);
    kv('Beschreibung:',     result.description || '-');
    kv('Wahlart:',          labelElectionType(result.election_type));
    kv('Auszählmethode:',   labelMethod(result.counting_method));
    kv('Sitze gesamt:',     result.seats_to_fill);
    kv('Wahlzeitraum:',     `${fmtDate(result.start)} – ${fmtDate(result.end)}`);
    kv('Ausgezählt am:',    fmtDateTime(result.counted_at));
    kv('Version:',          result.version);

    // ── Statistik ─────────────────────────────────────────────────────────────
    const total    = parseInt(result.total_ballots,   10) || 0;
    const valid    = parseInt(result.valid_ballots,   10) || 0;
    const invalid  = parseInt(result.invalid_ballots, 10) || 0;
    const eligible = parseInt(result.eligible_voters, 10) || 0;
    const rate     = eligible > 0 ? ((total / eligible) * 100).toFixed(2) : '0.00';

    section('WAHLSTATISTIK');
    kv('Wahlberechtigte:',        eligible, BLUE_BG);
    kv('Abgegebene Stimmzettel:', total,    BLUE_BG);
    kv('Gültige Stimmzettel:',    valid,    BLUE_BG);
    kv('Ungültige Stimmzettel:',  invalid,  BLUE_BG);
    kv('Beteiligungsquote:',      `${rate}%`, BLUE_BG);

    // ── Gleichstand-Hinweis ───────────────────────────────────────────────────
    if (data.ties_detected) {
      doc.moveDown(0.5);
      const wy = doc.y;
      const wh = 28;
      doc.rect(MARGIN, wy, CONTENT_W, wh).fill(YELLOW_BG);
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#CC6600')
         .text(
           `⚠  STIMMENGLEICHHEIT – ${data.tie_info || 'Losentscheid erforderlich'}`,
           MARGIN + 6, wy + 8,
           { width: CONTENT_W - 12, lineBreak: false, ellipsis: true },
         );
      doc.rect(MARGIN, wy, CONTENT_W, wh).strokeColor('#CC6600').lineWidth(1).stroke();
      doc.y = wy + wh;
    }

    // ── Ergebnisse ────────────────────────────────────────────────────────────
    section('ERGEBNIS');

    if (isProp) {
      // Verhältniswahl: Liste → Kandidaten
      const widths = [185, 70, 55, 75, 110];
      // Tabellenkopf (roter Hintergrund)
      const hdrY = doc.y;
      doc.rect(MARGIN, hdrY, CONTENT_W, 22).fill(HKA_RED);
      doc.y = hdrY;
      row(['Liste / Kandidat', 'Stimmen', 'Sitze', 'Quote', 'Status'], widths,
          { bold: true, color: WHITE, h: 22 });

      (data.allocation || []).forEach((listEntry) => {
        const listName = listEntry.firstname?.trim() || `Liste ${listEntry.listnum}`;
        const hasSeats = (listEntry.seats || 0) > 0;
        const listBg   = listEntry.is_tie ? YELLOW_BG : hasSeats ? GREEN_BG : LIST_BG;
        const listStatus = listEntry.is_tie
          ? '⚠ Gleichstand'
          : hasSeats ? '✓ Sitze erhalten' : 'Kein Sitz';

        row([listName, listEntry.votes, listEntry.seats ?? 0, listEntry.quota || '-', listStatus],
            widths, { bg: listBg, bold: true, h: 22 });

        (listEntry.list_candidates || []).forEach((c) => {
          row(
            [`${c.firstname} ${c.lastname}`, c.votes, '', '', c.is_elected ? '✓ Gewählt' : ''],
            widths,
            { bg: c.is_elected ? CAND_BG : null, indent: 16, h: 18 },
          );
        });
      });

    } else if (isRef) {
      // Referendum
      const widths = [225, 85, 85, 100];
      const hdrY = doc.y;
      doc.rect(MARGIN, hdrY, CONTENT_W, 22).fill(HKA_RED);
      doc.y = hdrY;
      row(['Option', 'Stimmen', 'Prozent', 'Status'], widths, { bold: true, color: WHITE, h: 22 });

      const refRows = data.yes_votes !== undefined
        ? [
            ['Ja',          data.yes_votes,       `${data.yes_percentage}%`,         data.result === 'ACCEPTED' ? 'Angenommen' : '-'],
            ['Nein',        data.no_votes,         `${data.no_percentage}%`,          data.result === 'REJECTED' ? 'Abgelehnt'  : '-'],
            ['Enthaltung',  data.abstain_votes||0, `${data.abstain_percentage||'0.00'}%`, '-'],
          ]
        : (data.all_candidates || []).map((c, i) => [
            c.name || `Option ${c.listnum}`, c.votes, c.percentage ? `${c.percentage}%` : '-',
            i === 0 && !data.ties_detected ? 'Gewinner' : '-',
          ]);

      refRows.forEach((r) => row(r, widths, { h: 20 }));

    } else {
      // Mehrheitswahl
      const widths = [40, 195, 80, 115, 65];
      const hdrY = doc.y;
      doc.rect(MARGIN, hdrY, CONTENT_W, 22).fill(HKA_RED);
      doc.y = hdrY;
      row(['Nr.', 'Kandidat:in', 'Stimmen', 'Status', 'Prozent'], widths,
          { bold: true, color: WHITE, h: 22 });

      const candidates = (data.allocation || data.all_candidates || data.elected || [])
        .filter((c) => (Number(c.votes) || 0) > 0);
      candidates.forEach((c) => {
        const status = c.is_elected ? 'GEWÄHLT' : c.is_tie ? 'GLEICHSTAND' : 'Nicht gewählt';
        const bg     = c.is_elected ? GREEN_BG : c.is_tie ? YELLOW_BG : null;
        row(
          [c.listnum, `${c.firstname||''} ${c.lastname||''}`.trim(), c.votes, status,
           c.percentage ? `${c.percentage}%` : '-'],
          widths, { bg, h: 20 },
        );
      });
    }

    // ── Unterschriftszeilen ───────────────────────────────────────────────────
    const SIG_BLOCK_H = 60;
    if (doc.y + 40 + SIG_BLOCK_H > PAGE_H - MARGIN) doc.addPage();
    const sigTopY  = doc.y + 40;
    const halfW    = (CONTENT_W - 30) / 2;
    const rightX   = MARGIN + halfW + 30;

    [[MARGIN, 'Ort, Datum, Unterschrift Wahlleitung'],
     [rightX,  'Ort, Datum, Unterschrift Wahlausschuss']].forEach(([x, label]) => {
      doc.moveTo(x, sigTopY).lineTo(x + halfW, sigTopY)
         .strokeColor(DARK).lineWidth(0.5).stroke();
      doc.fontSize(8).font('Helvetica').fillColor(DARK)
         .text(label, x, sigTopY + 5, { width: halfW, align: 'center' });
    });

    doc.end();
    logger.info(`PDF-Export erfolgreich für Ergebnis ${resultId}`);
    return await bufPromise;

  } catch (err) {
    logger.error('Fehler beim Erstellen des PDF-Exports:', err);
    throw err;
  } finally {
    db.release();
  }
};
