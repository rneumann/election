import { client } from '../database/db.js';

/**
 * Fetches all required rows of all candidates from the database.
 * @returns {Promise<Array>} The List of all candidates.
 */
export const getAllCandidates = async () => {
  const query = `
    SELECT 
      id,
      lastname AS "Lastname",
      firstname AS "Firstname",
      faculty AS "Fakultät", 
      notes AS "Notizen"
    FROM candidates 
    ORDER BY lastname ASC
  `;
  const result = await client.query(query);
  return result.rows;
};
