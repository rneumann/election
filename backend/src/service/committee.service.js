import { client } from '../database/db.js';
import { logger } from '../conf/logger/logger.js';

export const getAllCommitteeElections = async () => {
  const query = `
    SELECT id, info, description, start, "end"
    FROM elections
    WHERE "end" >= NOW()
    ORDER BY start ASC
  `;
  
  try {
    const result = await client.query(query);
    return result.rows;
  } catch (err) {
    logger.error('Error fetching committee elections:', err);
    throw new Error('Datenbankfehler beim Laden der Wahlen');
  }
};

export const getCandidatesForElection = async (electionId) => {
  const query = `
    SELECT 
      c.id, 
      c.firstname, 
      c.lastname, 
      c.faculty,
      -- WICHTIG: Dummies für fehlende Spalten
      NULL as email,
      NULL as description, 
      NULL as image,
      ec.listnum,
      -- das ist neu, die Spalte status gab es früher nicht
      ec.status
    FROM candidates c
    JOIN electioncandidates ec ON c.id = ec.candidateId
    WHERE ec.electionId = $1
    ORDER BY ec.listnum ASC, c.lastname ASC
  `;


  try {
    const result = await client.query(query, [electionId]);
    return result.rows;
  } catch (err) {
    logger.error(`Error fetching candidates for election ${electionId}:`, err);
    throw new Error('Datenbankfehler beim Laden der Kandidaten');
  }
};


/**
 * Holt alle Kandidaten und gruppiert ihre Wahlen.
 * Gibt zurück: Kandidat Infos + Liste der Wahlen inkl. Status.
 */
export const getAllCandidatesWithElections = async () => {
  // WICHTIG: Wir nutzen NULL as email/image, solange die Spalten in der DB fehlen.
  const query = `
    SELECT 
      c.id, 
      c.firstname, 
      c.lastname, 
      c.faculty, 
      NULL as email, -- FIX: Dummy-Wert, da Spalte noch fehlt
      NULL as image, -- FIX: Dummy-Wert, da Spalte noch fehlt
      json_agg(json_build_object(
        'electionId', e.id,
        'electionInfo', e.info,
        'status', ec.status,
        'isActive', (e."end" >= NOW())
      )) as elections
    FROM candidates c
    JOIN electioncandidates ec ON c.id = ec.candidateId
    JOIN elections e ON ec.electionId = e.id
    GROUP BY c.id
    ORDER BY c.lastname ASC
  `;

  try {
    const result = await client.query(query);
    return result.rows;
  } catch (err) {
    logger.error('Error fetching grouped candidates:', err);
    throw new Error('Fehler beim Laden der Kandidatenliste');
  }
};

/**
 * Aktualisiert den Status eines Kandidaten für eine bestimmte Wahl.
 */
export const updateCandidateStatus = async (candidateId, electionId, status) => {
  const query = `
    UPDATE electioncandidates
    SET status = $1
    WHERE candidateId = $2 AND electionId = $3
    RETURNING status
  `;
  
  try {
    const result = await client.query(query, [status, candidateId, electionId]);
    if (result.rowCount === 0) throw new Error('Eintrag nicht gefunden');
    return result.rows[0];
  } catch (err) {
    logger.error(`Error updating status for C:${candidateId} E:${electionId}`, err);
    throw new Error('Status konnte nicht aktualisiert werden');
  }
};