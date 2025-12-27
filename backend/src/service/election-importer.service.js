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
            const currentElectionType = electionData.type;

            // Spalten-Mapping: A=WahlKennung, B=Nr, C=uid, D=Liste/Schlüsselwort, E=Vorname, F=Nachname, G=Mtr-Nr, H=Fakultät, I=Studiengang
            const listnum = candidateSheet.getCell(`B${candRow}`).value
              ? Number(candidateSheet.getCell(`B${candRow}`).value)
              : candCount + 1;

            // UID wird aus Template gelesen (Spalte C)
            const templateUid = candidateSheet.getCell(`C${candRow}`).value?.toString().trim() || '';

            // Validierung: UID ist Pflichtfeld
            if (!templateUid) {
              throw new Error(
                `Zeile ${candRow}: UID (Spalte C) ist leer. UID ist ein Pflichtfeld.`,
              );
            }

            // Für Urabstimmungen: Prefix mit Wahlkennung für Eindeutigkeit
            let uid;
            if (currentElectionType === 'referendum') {
              // Wahlkennung normalisieren (Kleinbuchstaben, Sonderzeichen entfernen)
              const normalizedRef = electionRef
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '')
                .substring(0, MAX_UID_PREFIX_LENGTH);
              uid = `${normalizedRef}_${templateUid}`;
              
              // Sicherstellen, dass UID max 30 Zeichen (DB-Constraint)
              if (uid.length > MAX_UID_LENGTH) {
                uid = uid.substring(0, MAX_UID_LENGTH);
              }
            } else {
              uid = templateUid;
              if (uid.length > MAX_UID_LENGTH) {
                throw new Error(
                  `Zeile ${candRow}: UID "${uid}" ist zu lang (max. ${MAX_UID_LENGTH} Zeichen).`,
                );
              }
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

            // Für normale Wahlen: Vorname oder Nachname erforderlich
            // Für Urabstimmungen: Können leer sein
            if (firstname || lastname || currentElectionType === 'referendum') {
              const insertCandidateQuery = `
                INSERT INTO candidates 
                (uid, lastname, firstname, mtknr, faculty, keyword, notes, approved)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id
              `;

              const candRes = await db.query(insertCandidateQuery, [
                uid,
                lastname || null,
                firstname || null,
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

    // Referendum-Optionen aus Sheet "OptionsUrabstimmung" importieren
    const referendumElections = [...electionIdMap.entries()].filter(
      ([, data]) => data.type === 'referendum',
    );

    if (referendumElections.length > 0) {
      const optionsSheet = workbook.worksheets.find(
        (ws) => ws.name === 'OptionsUrabstimmung',
      );

      if (optionsSheet) {
        logger.info(`Verarbeite Referendum-Optionen aus Blatt "${optionsSheet.name}"...`);

        let optRow = 2; // Header in Zeile 1, Daten ab Zeile 2
        let optCount = 0;

        while (optionsSheet.getCell(`A${optRow}`).value) {
          const wahlkennung = optionsSheet.getCell(`A${optRow}`).value?.toString();
          const electionData = electionIdMap.get(wahlkennung);

          if (electionData && electionData.type === 'referendum') {
            const electionUUID = electionData.id;
            const nr = Number(optionsSheet.getCell(`B${optRow}`).value);
            const name = optionsSheet.getCell(`C${optRow}`).value?.toString().trim() || '';
            const description = optionsSheet.getCell(`D${optRow}`).value?.toString() || '';

            // Validierung
            if (!name) {
              throw new Error(
                `OptionsUrabstimmung Zeile ${optRow}: Name (Spalte C) ist leer.`,
              );
            }

            if (name.length > MAX_OPTION_NAME_LENGTH) {
              throw new Error(
                `OptionsUrabstimmung Zeile ${optRow}: Name "${name}" ist zu lang (max. ${MAX_OPTION_NAME_LENGTH} Zeichen).`,
              );
            }

            if (description.length > MAX_OPTION_DESCRIPTION_LENGTH) {
              throw new Error(
                `OptionsUrabstimmung Zeile ${optRow}: Description ist zu lang (max. ${MAX_OPTION_DESCRIPTION_LENGTH} Zeichen).`,
              );
            }

            if (!Number.isInteger(nr) || nr < 1) {
              throw new Error(
                `OptionsUrabstimmung Zeile ${optRow}: Nr (Spalte B) muss eine positive Ganzzahl sein.`,
              );
            }

            // Duplikat-Check: Prüfe ob Option mit gleicher Nr für diese Wahl bereits existiert
            const duplicateOptionCheck = await db.query(
              `SELECT id FROM candidate_options WHERE identifier = $1 AND nr = $2 LIMIT 1`,
              [electionUUID, nr],
            );

            if (duplicateOptionCheck.rows.length > 0) {
              throw new Error(
                `OptionsUrabstimmung Zeile ${optRow}: Option Nr. ${nr} für Wahl "${wahlkennung}" existiert bereits.`,
              );
            }

            // Insert in candidate_options
            const insertOptionQuery = `
              INSERT INTO candidate_options (identifier, nr, name, description)
              VALUES ($1, $2, $3, $4)
            `;

            await db.query(insertOptionQuery, [
              electionUUID,
              nr,
              name,
              description || null,
            ]);

            optCount++;
            logger.debug(`Option importiert: ${wahlkennung} - Nr ${nr}: ${name}`);
          } else if (wahlkennung && !electionData) {
            logger.warn(
              `OptionsUrabstimmung Zeile ${optRow}: Unbekannte Wahl-Referenz "${wahlkennung}".`,
            );
          } else if (electionData && electionData.type !== 'referendum') {
            logger.warn(
              `OptionsUrabstimmung Zeile ${optRow}: Wahl "${wahlkennung}" ist keine Urabstimmung - Option wird übersprungen.`,
            );
          }

          optRow++;
        }

        logger.info(`${optCount} Referendum-Optionen importiert.`);
      } else {
        logger.warn(
          'Sheet "OptionsUrabstimmung" nicht gefunden, aber Urabstimmungen definiert. Optionen wurden nicht importiert.',
        );
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
