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
      ec.listnum
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