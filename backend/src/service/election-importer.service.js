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

    // Start- und Enddatum aus den Zeilen vor der Header-Zeile lesen.
    // Das Template schreibt sie als erste Datenzeile nach den Headers,
    // readOdsSheets liefert diese Zeilen als dataRows[0] mit den Header-Namen als Keys.
    // Die Meta-Zeile hat in der Template-Struktur:
    //   Kennung='Wahlzeitraum von', Listen=startDatum, Plätze='bis', max. Kum.=endDatum
    const metaRow = wahlenSheet.dataRows?.[0] ?? {};
    const isMetaRow = String(metaRow['Kennung'] ?? '').trim() === 'Wahlzeitraum von';
    if (!isMetaRow) {
      throw new Error(
        'ODS-Datei: Erste Datenzeile im Blatt "Wahlen" muss "Wahlzeitraum von" enthalten.',
      );
    }

    const startDate = parseDate(metaRow['Listen']);
    const endDate = parseDate(metaRow['max. Kum.']);

    if (!startDate || isNaN(startDate) || !endDate || isNaN(endDate)) {
      throw new Error(
        'ODS-Datei: Start- oder Enddatum fehlt oder ist ungültig (Spalten C und F der Meta-Zeile).',
      );
    }

    await db.query('BEGIN');
    const electionIdMap = new Map();
    let importedCount = 0;

    // Wahldaten ab Index 1 lesen — Index 0 ist die Meta-Zeile
    const electionRows = wahlenSheet.dataRows.slice(1);
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

    // Kandidaten aus Blatt "Listenvorlage"
    const listenSheet = sheets['Listenvorlage'];
    if (listenSheet) {
      let candCount = 0;
      for (const row of listenSheet.dataRows ?? []) {
        const electionRef = row['Wahl Kennung']?.toString().trim();
        const electionData = electionIdMap.get(electionRef);
        if (!electionData) continue;

        const listnum = row['Nr'] ? Number(row['Nr']) : candCount + 1;
        let uid = row['UID']?.toString().trim() || '';
        if (!uid) throw new Error(`Kandidat ohne UID in Listenvorlage (Wahl: ${electionRef})`);
        if (electionData.type === 'referendum') {
          const normalizedRef = electionRef.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, MAX_UID_PREFIX_LENGTH);
          uid = `${normalizedRef}_${uid}`.substring(0, MAX_UID_LENGTH);
        } else if (uid.length > MAX_UID_LENGTH) {
          throw new Error(`UID "${uid}" zu lang (max. ${MAX_UID_LENGTH} Zeichen)`);
        }

        const firstname = row['Vorname']?.toString() || '';
        const lastname = row['Nachname']?.toString() || '';
        if (!firstname && !lastname && electionData.type !== 'referendum') continue;

        const candRes = await db.query(
          `INSERT INTO candidates (uid, lastname, firstname, mtknr, faculty, keyword, notes, approved)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
          [uid, lastname || null, firstname || null,
           row['Mtr-Nr.']?.toString() || '',
           row['Fakultät']?.toString() || '',
           row['Liste / Schlüsselwort']?.toString() || '',
           '', true],
        );
        await db.query(
          `INSERT INTO electioncandidates (electionId, candidateId, listnum) VALUES ($1,$2,$3)`,
          [electionData.id, candRes.rows[0].id, listnum],
        );
        candCount++;
      }
      logger.info(`ODS: ${candCount} Kandidaten importiert`);
    }

    // Referendum-Optionen aus Blatt "OptionsUrabstimmung"
    const optSheet = sheets['OptionsUrabstimmung'];
    if (optSheet) {
      let optCount = 0;
      for (const row of optSheet.dataRows ?? []) {
        const wahlkennung = row['Wahlkennung']?.toString().trim();
        const electionData = electionIdMap.get(wahlkennung);
        if (!electionData || electionData.type !== 'referendum') continue;

        const nr = Number(row['Nr']);
        const name = row['Name']?.toString().trim() || '';
        if (!name || !Number.isInteger(nr) || nr < 1) continue;

        await db.query(
          `INSERT INTO candidate_options (identifier, nr, name, description) VALUES ($1,$2,$3,$4)`,
          [electionData.id, nr, name, row['Description']?.toString() || null],
        );
        optCount++;
      }
      logger.info(`ODS: ${optCount} Referendum-Optionen importiert`);
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
