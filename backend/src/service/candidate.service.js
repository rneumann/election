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
    INSERT INTO candidate_information (candidate_uid, info, picture_content_type, picture_data)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `;
  const values = [
    candidateInfo.candidate_uid,
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
    WHERE candidate_uid = $4
    RETURNING id
  `;
  const values = [
    candidateInfo.info,
    candidateInfo.picture_content_type,
    candidateInfo.picture_data,
    candidateInfo.candidate_uid,
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
 * Deletes a candidate's information from the database.
 * @param {string} candidate_uid - The candidate's ID.
 * @returns {Promise<boolean>} A promise resolving to true if the candidate's information was deleted successfully, false otherwise.
 */
export const deleteCandidateInformation = async (candidate_uid) => {
  const query = `
    DELETE FROM candidate_information
    WHERE candidate_uid = $1
  `;
  const values = [candidate_uid];
  try {
    const result = await client.query(query, values);
    return result.rowCount > 0;
  } catch (error) {
    logger.debug('Error deleting candidate information:', error);
    logger.error('Failed to delete candidate information from the database.');
    throw new Error('Database delete operation failed.');
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

/**
 * Checks if a candidate already has information in the database.
 * @param {number} candidate_uid - The ID of the candidate to check.
 * @returns {Promise<boolean>} A promise resolving to true if the candidate already has information, false otherwise.
 */
export const checkIfCandidateAlreadyHasInfo = async (candidate_uid) => {
  const query = `
    SELECT COUNT(*) AS count
    FROM candidate_information
    WHERE candidate_uid = $1
  `;
  const values = [candidate_uid];
  try {
    const result = await client.query(query, values);
    return parseInt(result.rows[0].count, 10) > 0;
  } catch (error) {
    logger.debug('Error checking if candidate already has information:', error);
    logger.error('Failed to check if candidate already has information in the database.');
    throw new Error('Database query operation failed.');
  }
};
