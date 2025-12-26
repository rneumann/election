import ExcelJS from 'exceljs';
import { logger } from '../conf/logger/logger.js';
import { client } from '../database/db.js';

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

/**
 * Imports election data from an Excel file into the database.
 * Parses the Excel file row by row and inserts valid elections.
 *
 * @param {string} filePath - Path to the Excel file
 * @returns {Promise<number>} Number of successfully imported elections
 * @throws {Error} If file reading fails or validation errors occur
 */
export const importElectionData = async (filePath) => {
  const db = await client.connect();

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const electionSheet = workbook.worksheets[0];
    if (!electionSheet) {
      throw new Error('This workbook has no worksheets.');
    }

    const startDateStr = electionSheet.getCell('D3').value;
    const endDateStr = electionSheet.getCell('D4').value;

    if (!startDateStr || !endDateStr) {
      throw new Error('Start or end date missing expected in D3 and D4.');
    }

    const startDate = parseDate(startDateStr);
    const endDate = parseDate(endDateStr);

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

      const seatsToFill = Number(seatsValue);
      const votesPerBallot = votesPerBallotValue ? Number(votesPerBallotValue) : seatsToFill;
      const maxCumulativeVotes = Number(maxKumValue) || 0;

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
          max_cumulative_votes, start, "end", election_type, counting_method
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id;
      `;

      const res = await db.query(insertElectionQuery, [
        info,
        identifier,
        listvotes,
        seatsToFill,
        votesPerBallot,
        maxCumulativeVotes,
        startDate,
        endDate,
        electionType,
        countingMethod,
      ]);

      electionIdMap.set(identifier, { id: res.rows[0].id, type: electionType });
      rowIndex++;
      importedCount++;
    }

    if (workbook.worksheets.length > 2) {
      const candidateSheet = workbook.worksheets[2];
      if (!candidateSheet) {
        logger.warn(
          'Kandidatenblatt (worksheets[2]) nicht gefunden. Überspringe Kandidatenimport.',
        );
      } else {
        logger.info(`Verarbeite Kandidaten aus Blatt "${candidateSheet.name}"...`);

        let candRow = 2;
        let candCount = 0;

        while (candidateSheet.getCell(`A${candRow}`).value) {
          const electionRef = candidateSheet.getCell(`A${candRow}`).value?.toString();
          const electionData = electionIdMap.get(electionRef);

          if (electionData) {
            const electionUUID = electionData.id;
            // const currentElectionType = electionData.type; // TODO: Wird für Referendum-Logik benötigt

            // Spalten-Mapping: A=WahlKennung, B=Nr, C=uid, D=Liste/Schlüsselwort, E=Vorname, F=Nachname, G=Mtr-Nr, H=Fakultät, I=Studiengang
            const listnum = candidateSheet.getCell(`B${candRow}`).value
              ? Number(candidateSheet.getCell(`B${candRow}`).value)
              : candCount + 1;

            // UID wird aus Template gelesen (Spalte C)
            const uid = candidateSheet.getCell(`C${candRow}`).value?.toString().trim() || '';

            // Validierung: UID ist Pflichtfeld
            if (!uid) {
              throw new Error(
                `Zeile ${candRow}: UID (Spalte C) ist leer. UID ist ein Pflichtfeld (z.B. "grso1012").`,
              );
            }

            const keywords = candidateSheet.getCell(`D${candRow}`).value?.toString() || '';
            const firstname = candidateSheet.getCell(`E${candRow}`).value?.toString() || '';
            const lastname = candidateSheet.getCell(`F${candRow}`).value?.toString() || '';
            const matrNr = candidateSheet.getCell(`G${candRow}`).value?.toString() || '';
            const faculty = candidateSheet.getCell(`H${candRow}`).value?.toString() || '';

            const notes = '';

            // const admittedRaw = candidateSheet.getCell(`D${candRow}`).value;
            //const isAdmitted =
            //admittedRaw === false ||
            //String(admittedRaw).toLowerCase() === 'false' ||
            //String(admittedRaw).toLowerCase() === 'nein'
            //? false
            //: true;
            const isAdmitted = true;

            if (firstname || lastname) {
              const insertCandidateQuery = `
                INSERT INTO candidates 
                (uid, lastname, firstname, mtknr, faculty, keyword, notes, approved)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id
              `;

              const candRes = await db.query(insertCandidateQuery, [
                uid,
                lastname,
                firstname,
                matrNr,
                faculty,
                keywords,
                notes,
                isAdmitted,
              ]);

              const newCandidateId = candRes.rows[0].id;

              const linkQuery = `
                INSERT INTO electioncandidates (electionId, candidateId, listnum)
                VALUES ($1, $2, $3)
              `;

              await db.query(linkQuery, [electionUUID, newCandidateId, listnum]);

              // TODO: Referendum-Optionen werden aus separatem Sheet "OptionsUrabstimmung" gelesen
              // if (currentElectionType === 'referendum' && info) {
              //   logger.debug(`referendum election has option with info: ${uid}`);
              //   const insertCandidateInfoQuery = `
              //     INSERT INTO candidate_information (candidate_uid, info)
              //     VALUES ($1, $2)
              //   `;
              //   logger.debug(
              //     `insertCandidateInfoQuery: ${insertCandidateInfoQuery} --- params: ${uid} ${info}`,
              //   );
              //   await db.query(insertCandidateInfoQuery, [uid, info]);
              // } else if (currentElectionType === 'referendum' && !info) {
              //   logger.warn(`referendum election has option without info: ${uid}`);
              // }

              candCount++;
            }
          } else {
            if (electionRef) {
              logger.warn(`Zeile ${candRow}: Unbekannte Wahl-Referenz "${electionRef}".`);
            }
          }
          candRow++;
        }
        logger.info(`${candCount} Kandidaten importiert und verknüpft.`);
      }
    }

    await db.query('COMMIT');
    return importedCount;
  } catch (err) {
    await db.query('ROLLBACK');
    logger.error('Error during Excel import:', err);

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

/**
 * Parses a date from various formats.
 * @param {*} value
 * @returns
 */
const parseDate = (value) => {
  if (value instanceof Date) {
    return value;
  }
  const s = String(value).trim();
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    return new Date(`${m[3]}-${m[2]}-${m[1]}`);
  }
  return new Date(s);
};
