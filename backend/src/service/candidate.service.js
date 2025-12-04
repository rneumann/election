import { logger } from '../conf/logger/logger.js';
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

/**
 * Uploads a candidate's information to the database.
 * @param {Object} candidateInfo - The candidate's information.
 * @param {number} candidateInfo.candidate_id - The candidate's ID.
 * @param {string} candidateInfo.info - The candidate's information.
 * @param {string} candidateInfo.picture_content_type - The content type of the candidate's picture.
 * @param {Buffer} candidateInfo.picture_data - The candidate's picture data.
 * @returns {Promise<Object>} The inserted candidate information.
 */
export const uploadCandidateInformation = async (candidateInfo) => {
  const query = `
    INSERT INTO candidate_information (candidate_id, info, picture_content_type, picture_data)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `;
  const values = [
    candidateInfo.candidate_id,
    candidateInfo.info,
    candidateInfo.picture_content_type,
    candidateInfo.picture_data,
  ];
  try {
    const result = await client.query(query, values);
    return result.rows[0];
  } catch (error) {
    logger.debug('Error inserting candidate information:', error);
    logger.error('Failed to insert candidate information in the database.');
    throw new Error('Database insert operation failed.');
  }
};

/**
 * Updates a candidate's information in the database.
 * @param {Object} candidateInfo - The candidate's information.
 * @param {number} candidateInfo.candidate_id - The candidate's ID.
 * @param {string} candidateInfo.info - The candidate's information.
 * @param {string} candidateInfo.picture_content_type - The content type of the candidate's picture.
 * @param {Buffer} candidateInfo.picture_data - The candidate's picture data.
 * @returns {Promise<Object>} The updated candidate information.
 */
export const updateCandidateInformation = async (candidateInfo) => {
  const query = `
    UPDATE candidate_information
    SET info = $1, picture_content_type = $2, picture_data = $3
    WHERE candidate_id = $4
    RETURNING id
  `;
  const values = [
    candidateInfo.info,
    candidateInfo.picture_content_type,
    candidateInfo.picture_data,
    candidateInfo.candidate_id,
  ];
  try {
    const result = await client.query(query, values);
    return result.rows[0];
  } catch (error) {
    logger.debug('Error updating candidate information:', error);
    logger.error('Failed to update candidate information in the database.');
    throw new Error('Database update operation failed.');
  }
};

/**
 * Checks if a voter is a candidate by checking if the voter's ID exists in the candidates table.
 * @param {number} uid - The ID of the voter to check.
 * @returns {Promise<boolean>} A promise resolving to true if the voter is a candidate, false otherwise.
 */
export const checkIfVoterIsCandidate = async (uid) => {
  const query = `
    SELECT COUNT(*) AS count
    FROM candidates
    WHERE uid = $1
  `;
  const values = [uid];
  try {
    const result = await client.query(query, values);
    return parseInt(result.rows[0].count, 10) > 0;
  } catch (error) {
    logger.debug('Error checking if voter is candidate:', error);
    logger.error('Failed to check if voter is candidate in the database.');
    throw new Error('Database query operation failed.');
  }
};
