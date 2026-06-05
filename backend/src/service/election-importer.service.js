import ExcelJS from 'exceljs';
import { logger } from '../conf/logger/logger.js';
import { client } from '../database/db.js';
import { readOdsSheets, isOdsFile } from '../utils/ods.js';

const ELECTION_TYPE_MAPPING = new Map([
  ['Mehrheitswahl', 'majority_vote'],
  ['Verhältniswahl', 'proportional_representation'],
  ['Urabstimmung', 'referendum'],
]);

const COUNTING_METHOD_MAPPING = new Map([
  ['Sainte-Laguë', 'sainte_lague'],
  ['Hare-Niemeyer', 'hare_niemeyer'],
  ['Einfache Mehrheit', 'highest_votes_simple'],
  ['Absolute Mehrheit', 'highest_votes_absolute'],
  ['Ja/Nein/Enthaltung', 'yes_no_referendum'],
]);

// Konstanten für Validierung (DB-Constraints)
const MAX_OPTION_NAME_LENGTH = 50;
const MAX_OPTION_DESCRIPTION_LENGTH = 800;
const MAX_UID_LENGTH = 30;
const MAX_UID_PREFIX_LENGTH = 20;

/**
 * Imports election data from an Excel file into the database.
 * Parses the Excel file row by row and inserts valid elections.
 *
 * @param {string} filePath - Path to the Excel file
 * @returns {Promise<number>} Number of successfully imported elections
 * @throws {Error} If file reading fails or validation errors occur
 */
/**
 * Dispatcher: wählt anhand der Dateiendung den passenden Importer.
 * @param {string} filePath
 * @returns {Promise<number>} Anzahl importierter Wahlen
 */
export const importElectionData = async (filePath) => {
  if (isOdsFile(filePath)) {
    return importElectionDataOds(filePath);
  }
  return importElectionDataXlsx(filePath);
};

// ─── XLSX ────────────────────────────────────────────────────────────────────

/**
 * Importiert Wahldefinitionen aus einer Excel-Datei (.xlsx/.xls).
 * @param {string} filePath
 * @returns {Promise<number>} Anzahl importierter Wahlen
 */
const importElectionDataXlsx = async (filePath) => {
  const db = await client.connect();

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const electionSheet = workbook.worksheets[0];
    if (!electionSheet) {
      throw new Error('This workbook has no worksheets.');
    }

    const startDateStr = electionSheet.getCell('D3').value;
    const startTimeStr = electionSheet.getCell('F3').value;
    const endDateStr   = electionSheet.getCell('D4').value;
    const endTimeStr   = electionSheet.getCell('F4').value;

    if (!startDateStr || !endDateStr) {
      throw new Error('Start- oder Enddatum fehlt (erwartet in D3 und D4).');
    }

    const startDate = parseLocalDateTime(startDateStr, startTimeStr);
    const endDate   = parseLocalDateTime(endDateStr, endTimeStr);

    logger.info(`Importing elections for period ${startDate} → ${endDate}`);

    await db.query('BEGIN');

    const electionIdMap = new Map();
    let rowIndex = 8;
    let importedCount = 0;

    while (electionSheet.getCell(`A${rowIndex}`).value) {
      const identifier = electionSheet.getCell(`A${rowIndex}`).value?.toString();
      const info = electionSheet.getCell(`B${rowIndex}`).value?.toString() || '';
      const listValRaw = electionSheet.getCell(`C${rowIndex}`).value;
      const listvotes =
        listValRaw == 1 || listValRaw == '1' || listValRaw === true ? 1 : parseInt(listValRaw) || 0;
      const seatsValue = electionSheet.getCell(`D${rowIndex}`).value;
      const votesPerBallotValue = electionSheet.getCell(`E${rowIndex}`).value;
      const maxKumValue = electionSheet.getCell(`F${rowIndex}`).value;
      const electionTypeText = electionSheet.getCell(`G${rowIndex}`).value?.toString().trim();
      const countingMethodText = electionSheet.getCell(`H${rowIndex}`).value?.toString().trim();
      const freeSlotsValue = electionSheet.getCell(`I${rowIndex}`).value;

      const seatsToFill = Number(seatsValue);
      const votesPerBallot = votesPerBallotValue ? Number(votesPerBallotValue) : seatsToFill;
      const maxCumulativeVotes = Number(maxKumValue) || 0;
      const freeSlots = Number.isInteger(Number(freeSlotsValue)) ? Math.max(0, Number(freeSlotsValue)) : 0;

      if (!Number.isInteger(seatsToFill) || seatsToFill < 1) {
        throw new Error(
          `Invalid seats_to_fill in row ${rowIndex}: must be a positive integer, got ${seatsValue}`,
        );
      }
      const electionType = ELECTION_TYPE_MAPPING.get(electionTypeText);
      if (!electionType) {
        throw new Error(
          `Invalid election_type '${electionTypeText}' in row ${rowIndex}. Expected: Mehrheitswahl, Verhältniswahl, or Urabstimmung.`,
        );
      }
      const countingMethod = COUNTING_METHOD_MAPPING.get(countingMethodText);
      if (!countingMethod) {
        throw new Error(
          `Invalid counting_method '${countingMethodText}' in row ${rowIndex}. Expected: Sainte-Laguë, Hare-Niemeyer, Einfache Mehrheit, Absolute Mehrheit, or Ja/Nein/Enthaltung.`,
        );
      }
      logger.info(
        `Row ${rowIndex}: ${info} → election_type=${electionType}, counting_method=${countingMethod}`,
      );

      // Check for duplicates: same info and date range
      const duplicateCheckQuery = `
        SELECT id FROM elections 
        WHERE info = $1 AND start = $2 AND "end" = $3
        LIMIT 1;
      `;
      const duplicateCheck = await db.query(duplicateCheckQuery, [info, startDate, endDate]);

      if (duplicateCheck.rows.length > 0) {
        throw new Error(
          `Wahl "${info}" (${startDate} - ${endDate}) existiert bereits. Import abgebrochen.`,
        );
      }

      const insertElectionQuery = `
        INSERT INTO elections (
          info, description, listvotes, seats_to_fill, votes_per_ballot,
          max_cumulative_votes, free_slots, start, "end", election_type, counting_method
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id;
      `;

      const res = await db.query(insertElectionQuery, [
        info,
        identifier,
        listvotes,
        seatsToFill,
        votesPerBallot,
        maxCumulativeVotes,
        freeSlots,
        startDate,
        endDate,
        electionType,
        countingMethod,
      ]);

      electionIdMap.set(identifier, { id: res.rows[0].id, type: electionType });
      rowIndex++;
      importedCount++;
    }

    // Sheets 2..N: Blattname = Wahlkennung
    // Kandidatenblätter: A=Nr, B=UID, C=Schlüsselwort, D=Vorname, E=Nachname, F=Mtr-Nr, G=Fakultät
    // Urabstimmungsblätter: A=Nr, B=Name, C=Description
    for (const sheet of workbook.worksheets.slice(1)) {
      const electionRef = sheet.name;
      const electionData = electionIdMap.get(electionRef);

      if (!electionData) {
        logger.warn(`Blatt "${electionRef}" keiner bekannten Wahl zugeordnet — übersprungen.`);
        continue;
      }

      const electionUUID = electionData.id;
      const currentElectionType = electionData.type;
      logger.info(`Verarbeite Blatt "${electionRef}" (${currentElectionType})...`);

      let row = 2;
      let count = 0;

      if (currentElectionType === 'referendum') {
        // Urabstimmung: A=Nr, B=Name, C=Description
        while (sheet.getCell(`A${row}`).value) {
          const nr = Number(sheet.getCell(`A${row}`).value);
          const name = sheet.getCell(`B${row}`).value?.toString().trim() || '';
          const description = sheet.getCell(`C${row}`).value?.toString() || '';

          if (!name) throw new Error(`Blatt "${electionRef}" Zeile ${row}: Name (Spalte B) ist leer.`);
          if (name.length > MAX_OPTION_NAME_LENGTH) throw new Error(`Blatt "${electionRef}" Zeile ${row}: Name zu lang (max. ${MAX_OPTION_NAME_LENGTH}).`);
          if (description.length > MAX_OPTION_DESCRIPTION_LENGTH) throw new Error(`Blatt "${electionRef}" Zeile ${row}: Description zu lang.`);
          if (!Number.isInteger(nr) || nr < 1) throw new Error(`Blatt "${electionRef}" Zeile ${row}: Nr muss positive Ganzzahl sein.`);

          const dupCheck = await db.query(
            'SELECT id FROM candidate_options WHERE identifier = $1 AND nr = $2 LIMIT 1',
            [electionUUID, nr],
          );
          if (dupCheck.rows.length > 0) throw new Error(`Blatt "${electionRef}" Zeile ${row}: Option Nr. ${nr} existiert bereits.`);

          await db.query(
            'INSERT INTO candidate_options (identifier, nr, name, description) VALUES ($1, $2, $3, $4)',
            [electionUUID, nr, name, description || null],
          );
          count++;
          row++;
        }
        logger.info(`${count} Referendum-Optionen für "${electionRef}" importiert.`);
      } else {
        // Normale Wahl: A=Nr, B=UID, C=Schlüsselwort, D=Vorname, E=Nachname, F=Mtr-Nr, G=Fakultät
        while (sheet.getCell(`A${row}`).value) {
          const listnum = Number(sheet.getCell(`A${row}`).value) || (count + 1);

          const uidCell = sheet.getCell(`B${row}`);
          let templateUid = '';
          if (uidCell.value !== null && uidCell.value !== undefined) {
            templateUid = typeof uidCell.value === 'number'
              ? uidCell.value.toString().replace('.', ',')
              : (uidCell.text?.trim() || uidCell.value.toString().trim());
          }
          if (!templateUid) throw new Error(`Blatt "${electionRef}" Zeile ${row}: UID (Spalte B) ist leer.`);
          if (templateUid.length > MAX_UID_LENGTH) throw new Error(`Blatt "${electionRef}" Zeile ${row}: UID zu lang (max. ${MAX_UID_LENGTH}).`);

          const keywords = sheet.getCell(`C${row}`).value?.toString() || '';
          const firstname = sheet.getCell(`D${row}`).value?.toString() || '';
          const lastname  = sheet.getCell(`E${row}`).value?.toString() || '';
          const matrNr    = sheet.getCell(`F${row}`).value?.toString() || '';
          const faculty   = sheet.getCell(`G${row}`).value?.toString() || '';

          if (!firstname && !lastname) {
            logger.warn(`Blatt "${electionRef}" Zeile ${row}: Weder Vorname noch Nachname — übersprungen.`);
            row++;
            continue;
          }

          const candRes = await db.query(`
            INSERT INTO candidates (uid, lastname, firstname, mtknr, faculty, keyword, notes, approved)
            VALUES ($1, $2, $3, $4, $5, $6, '', true)
            ON CONFLICT (uid) DO UPDATE SET
              lastname = EXCLUDED.lastname, firstname = EXCLUDED.firstname,
              mtknr = EXCLUDED.mtknr, faculty = EXCLUDED.faculty, keyword = EXCLUDED.keyword
            RETURNING id`,
            [templateUid, lastname || null, firstname || null, matrNr, faculty, keywords],
          );

          await db.query(`
            INSERT INTO electioncandidates (electionId, candidateId, listnum)
            VALUES ($1, $2, $3)
            ON CONFLICT (electionId, candidateId) DO NOTHING`,
            [electionUUID, candRes.rows[0].id, listnum],
          );
          count++;
          row++;
        }
        logger.info(`${count} Kandidaten für "${electionRef}" importiert.`);
      }
    }

    await db.query('COMMIT');
    return importedCount;
  } catch (err) {
    await db.query('ROLLBACK');
    logger.error('Fehler beim Excel-Import:', err);
    if (err.message.includes('relation "electioncandidates" does not exist')) {
      throw new Error(
        "Datenbankfehler: Tabelle 'electioncandidates' nicht gefunden. Prüfen Sie, ob sie 'election_candidates' heißt.",
      );
    }
    throw err;
  } finally {
    db.release();
  }
};

// ─── ODS ─────────────────────────────────────────────────────────────────────

/**
 * Importiert Wahldefinitionen aus einer ODS-Datei.
 * @param {string} filePath
 * @returns {Promise<number>} Anzahl importierter Wahlen
 */
const importElectionDataOds = async (filePath) => {
  const db = await client.connect();

  try {
    const sheets = await readOdsSheets(filePath);

    // Blatt "Wahlen" auslesen
    const wahlenSheet = sheets['Wahlen'];
    if (!wahlenSheet) {
      throw new Error('ODS-Datei: Blatt "Wahlen" nicht gefunden');
    }

    // Meta-Zeilen: Zeile 1 = "Wahlzeitraum von | Datum: | <Datum> | Uhrzeit (HH:MM): | <Zeit>"
    //              Zeile 2 = "bis              | Datum: | <Datum> | Uhrzeit (HH:MM): | <Zeit>"
    // readOdsSheets liefert alle Zeilen als dataRows mit Header-Spalten-Keys.
    // Die Spalten-Keys im Wahlen-Blatt: Kennung, Info, Listen, Plätze, Stimmen pro Zettel,
    //   max. Kum., Wahltyp, Zählverfahren, Freie Plätze
    // Meta-Zeile 1: Kennung='Wahlzeitraum von', Info='Datum:', Listen=<Datum>, Plätze='Uhrzeit (HH:MM):', 'Stimmen pro Zettel'=<Zeit>
    // Meta-Zeile 2: Kennung='bis',              Info='Datum:', Listen=<Datum>, Plätze='Uhrzeit (HH:MM):', 'Stimmen pro Zettel'=<Zeit>
    const row0 = wahlenSheet.dataRows?.[0] ?? {};
    const row1 = wahlenSheet.dataRows?.[1] ?? {};
    if (String(row0['Kennung'] ?? '').trim() !== 'Wahlzeitraum von') {
      throw new Error('ODS-Datei: Erste Zeile im Blatt "Wahlen" muss "Wahlzeitraum von" enthalten.');
    }

    const startDate = parseLocalDateTime(row0['Listen'], row0['Stimmen pro Zettel']);
    const endDate   = parseLocalDateTime(row1['Listen'], row1['Stimmen pro Zettel']);

    if (!startDate || !endDate) {
      throw new Error('ODS-Datei: Start- oder Enddatum fehlt (Spalte C der Meta-Zeilen).');
    }

    await db.query('BEGIN');
    const electionIdMap = new Map();
    let importedCount = 0;

    // Wahldaten ab Index 2 lesen — Indizes 0+1 sind die Meta-Zeilen
    const electionRows = wahlenSheet.dataRows.slice(2);
    for (const row of electionRows) {
      const identifier = row['Kennung']?.toString().trim();
      if (!identifier) continue;

      const info = row['Info'] || '';
      const listValRaw = row['Listen'];
      const listvotes =
        listValRaw == 1 || listValRaw === 'true' ? 1 : parseInt(listValRaw) || 0;
      const seatsToFill = Number(row['Plätze']);
      const votesPerBallotRaw = row['Stimmen pro Zettel'];
      const votesPerBallot = votesPerBallotRaw ? Number(votesPerBallotRaw) : seatsToFill;
      const maxCumulativeVotes = Number(row['max. Kum.']) || 0;
      const freeSlots = Math.max(0, parseInt(row['Freie Plätze'] ?? '0') || 0);
      const electionTypeText = row['Wahltyp']?.toString().trim();
      const countingMethodText = row['Zählverfahren']?.toString().trim();

      if (!Number.isInteger(seatsToFill) || seatsToFill < 1) {
        throw new Error(`Ungültige Plätze für Wahl "${identifier}": ${row['Plätze']}`);
      }
      const electionType = ELECTION_TYPE_MAPPING.get(electionTypeText);
      if (!electionType) {
        throw new Error(`Ungültiger Wahltyp "${electionTypeText}" für Wahl "${identifier}"`);
      }
      const countingMethod = COUNTING_METHOD_MAPPING.get(countingMethodText);
      if (!countingMethod) {
        throw new Error(`Ungültiges Zählverfahren "${countingMethodText}" für Wahl "${identifier}"`);
      }

      const duplicateCheck = await db.query(
        `SELECT id FROM elections WHERE info = $1 AND start = $2 AND "end" = $3 LIMIT 1`,
        [info, startDate, endDate],
      );
      if (duplicateCheck.rows.length > 0) {
        throw new Error(`Wahl "${info}" (${startDate} - ${endDate}) existiert bereits.`);
      }

      const res = await db.query(
        `INSERT INTO elections (info, description, listvotes, seats_to_fill, votes_per_ballot,
          max_cumulative_votes, free_slots, start, "end", election_type, counting_method)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [info, identifier, listvotes, seatsToFill, votesPerBallot, maxCumulativeVotes,
          freeSlots, startDate, endDate, electionType, countingMethod],
      );

      electionIdMap.set(identifier, { id: res.rows[0].id, type: electionType });
      importedCount++;
    }

    // Blätter 2..N: Blattname = Wahlkennung (identisch zur XLSX-Logik)
    for (const [sheetName, sheet] of Object.entries(sheets)) {
      if (sheetName === 'Wahlen') continue;
      const electionData = electionIdMap.get(sheetName);
      if (!electionData) {
        logger.warn(`ODS: Blatt "${sheetName}" keiner bekannten Wahl zugeordnet — übersprungen.`);
        continue;
      }

      const electionUUID = electionData.id;
      const currentElectionType = electionData.type;
      let count = 0;

      if (currentElectionType === 'referendum') {
        // Urabstimmung: Nr, Name, Description
        for (const row of sheet.dataRows ?? []) {
          const nr = Number(row['Nr']);
          const name = row['Name']?.toString().trim() || '';
          if (!name || !Number.isInteger(nr) || nr < 1) continue;
          await db.query(
            `INSERT INTO candidate_options (identifier, nr, name, description) VALUES ($1,$2,$3,$4)`,
            [electionUUID, nr, name, row['Description']?.toString() || null],
          );
          count++;
        }
        logger.info(`ODS: ${count} Referendum-Optionen für "${sheetName}" importiert.`);
      } else {
        // Kandidaten: Nr, UID, Liste/Schlüsselwort, Vorname, Nachname, Mtr-Nr., Fakultät
        for (const [i, row] of (sheet.dataRows ?? []).entries()) {
          const listnum = row['Nr'] ? Number(row['Nr']) : i + 1;
          let uid = row['UID']?.toString().trim() || '';
          if (!uid) throw new Error(`ODS Blatt "${sheetName}" Zeile ${i + 2}: UID fehlt.`);
          if (uid.length > MAX_UID_LENGTH) throw new Error(`ODS Blatt "${sheetName}": UID zu lang.`);

          const firstname = row['Vorname']?.toString() || '';
          const lastname  = row['Nachname']?.toString() || '';
          if (!firstname && !lastname) continue;

          const candRes = await db.query(
            `INSERT INTO candidates (uid, lastname, firstname, mtknr, faculty, keyword, notes, approved)
             VALUES ($1,$2,$3,$4,$5,$6,'',true)
             ON CONFLICT (uid) DO UPDATE SET
               lastname=EXCLUDED.lastname, firstname=EXCLUDED.firstname,
               mtknr=EXCLUDED.mtknr, faculty=EXCLUDED.faculty, keyword=EXCLUDED.keyword
             RETURNING id`,
            [uid, lastname || null, firstname || null,
             row['Mtr-Nr.']?.toString() || '',
             row['Fakultät']?.toString() || '',
             row['Liste / Schlüsselwort']?.toString() || ''],
          );
          await db.query(
            `INSERT INTO electioncandidates (electionId, candidateId, listnum)
             VALUES ($1,$2,$3) ON CONFLICT (electionId, candidateId) DO NOTHING`,
            [electionUUID, candRes.rows[0].id, listnum],
          );
          count++;
        }
        logger.info(`ODS: ${count} Kandidaten für "${sheetName}" importiert.`);
      }
    }

    await db.query('COMMIT');
    return importedCount;
  } catch (err) {
    await db.query('ROLLBACK');
    logger.error('ODS Import Fehler:', err);
    throw err;
  } finally {
    db.release();
  }
};

/**
 * Parst Datum und optionale Uhrzeit als lokale Zeit (Europe/Berlin) und gibt
 * einen ISO-String mit korrektem UTC-Offset zurück.
 * Vermeidet den klassischen Timezone-Bug: new Date('2026-06-10') → UTC-Mitternacht
 * → landet als 02:00 MESZ in der DB.
 *
 * @param {Date|string|number} dateVal - Datumswert aus Excel (D3/D4)
 * @param {string|null} timeVal       - Uhrzeit als "HH:MM" aus Excel (F3/F4), optional
 * @returns {string} ISO-Timestamp für PostgreSQL TIMESTAMPTZ
 */
const parseLocalDateTime = (dateVal, timeVal) => {
  // Datum normalisieren
  let dateStr;
  if (dateVal instanceof Date) {
    // ExcelJS liefert Date-Objekte in UTC — wir wollen nur das lokale Datum
    const y = dateVal.getUTCFullYear();
    const m = String(dateVal.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dateVal.getUTCDate()).padStart(2, '0');
    dateStr = `${y}-${m}-${d}`;
  } else {
    const s = String(dateVal).trim();
    // Deutsches Format TT.MM.JJJJ
    const dm = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dm) {
      dateStr = `${dm[3]}-${dm[2].padStart(2,'0')}-${dm[1].padStart(2,'0')}`;
    } else {
      dateStr = s; // ISO oder anderes Format, direkt verwenden
    }
  }

  // Uhrzeit normalisieren (Standard: 00:00)
  let timeStr = '00:00';
  if (timeVal) {
    const t = String(timeVal).trim();
    if (/^\d{1,2}:\d{2}$/.test(t)) {
      timeStr = t.padStart(5, '0');
    }
  }

  // Als lokale Berlin-Zeit interpretieren und an PostgreSQL übergeben
  // PostgreSQL mit TIMESTAMPTZ + gesetzter Zeitzone interpretiert das korrekt
  return `${dateStr}T${timeStr}:00`;
};
