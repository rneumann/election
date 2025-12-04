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
    if (!electionSheet) throw new Error('Die Excel-Datei ist leer.');

    const startDateStr = electionSheet.getCell('D3').value;
    const endDateStr = electionSheet.getCell('D4').value;

    if (!startDateStr || !endDateStr) {
      throw new Error('Start- oder Enddatum fehlt (erwartet in Zellen D3 und D4).');
    }

    const startDate = parseDate(startDateStr);
    const endDate = parseDate(endDateStr);

    logger.info(`Importiere Wahlen für Zeitraum: ${startDate} -> ${endDate}`);

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

      if (!Number.isInteger(seatsToFill) || seatsToFill < 1)
        throw new Error(`Zeile ${rowIndex}: 'Plätze' ungültig.`);

      const electionType = ELECTION_TYPE_MAPPING.get(electionTypeText);
      if (!electionType)
        throw new Error(`Zeile ${rowIndex}: Unbekannter Wahltyp '${electionTypeText}'`);

      const countingMethod = COUNTING_METHOD_MAPPING.get(countingMethodText);
      if (!countingMethod)
        throw new Error(`Zeile ${rowIndex}: Unbekanntes Zählverfahren '${countingMethodText}'`);

      logger.info(`Zeile ${rowIndex}: Importiere Wahl "${identifier}"`);

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

      electionIdMap.set(identifier, res.rows[0].id);
      rowIndex++;
      importedCount++;
    }

    if (workbook.worksheets.length > 1) {
      const candidateSheet = workbook.worksheets[2];
      logger.info(`Verarbeite Kandidaten aus Blatt "${candidateSheet.name}"...`);

      let candRow = 2;
      let candCount = 0;

      while (candidateSheet.getCell(`A${candRow}`).value) {
        const electionRef = candidateSheet.getCell(`A${candRow}`).value?.toString();
        const electionUUID = electionIdMap.get(electionRef);

        if (electionUUID) {
          const lastname = candidateSheet.getCell(`D${candRow}`).value?.toString() || '';
          const firstname = candidateSheet.getCell(`E${candRow}`).value?.toString() || '';
          const matrNr = candidateSheet.getCell(`B${candRow}`).value?.toString() || '';
          const faculty = candidateSheet.getCell(`C${candRow}`).value?.toString() || '';
          const keywords = candidateSheet.getCell(`F${candRow}`).value?.toString() || '';
          const notes = candidateSheet.getCell(`G${candRow}`).value?.toString() || '';

          const admittedRaw = candidateSheet.getCell(`H${candRow}`).value;
          const isAdmitted =
            admittedRaw === false ||
            String(admittedRaw).toLowerCase() === 'false' ||
            String(admittedRaw).toLowerCase() === 'nein'
              ? false
              : true;

          if (lastname) {
            const insertCandidateQuery = `
              INSERT INTO candidates 
              (lastname, firstname, mtknr, faculty, keyword, notes, approved)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              RETURNING id
            `;

            const candRes = await db.query(insertCandidateQuery, [
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

            await db.query(linkQuery, [electionUUID, newCandidateId, candCount]);
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

const parseDate = (value) => {
  if (value instanceof Date) return value;
  const s = String(value).trim();
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}`);
  return new Date(s);
};
