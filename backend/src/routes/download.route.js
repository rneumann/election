import { logger } from '../conf/logger/logger.js';
import { client } from '../database/db.js';

/**
 * Route handler for exporting aggregated election results.
 * This route expects a GET request with an electionId as a URL parameter
 * (e.g., /download/totalresults/some-uuid).
 *
 * Behavior:
 * - Validates the HTTP method.
 * - Validates the presence of the electionId.
 * - Queries the database for aggregated vote counts (total votes per candidate).
 * - Sends a JSON file as a download.
 *
 * @async
 * @param {Object} req - The Express request object
 * @param {Object} res - The Express response object
 * @param {Function} next - The Express next middleware function
 * @returns {Promise<Response>} JSON file download or JSON error response
 */
export const exportTotalResultsRoute = async (req, res, next) => {
  logger.debug('Export route for total results accessed');

  // Validate HTTP method
  if (req.method !== 'GET') {
    logger.warn(`Invalid HTTP method used: ${req.method}`);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Validate parameter
  const { electionId } = req.params;
  if (!electionId) {
    logger.warn('No electionId provided in the request');
    return res.status(400).json({ message: 'electionId is required' });
  }

  try {
    // Query for aggregated results
    const query = `
      SELECT 
        c.firstname || ' ' || c.lastname AS candidate,
        SUM(bv.votes) AS votes
      FROM 
        candidates c
      JOIN 
        electioncandidates ec ON c.id = ec.candidateId
      JOIN
        ballotvotes bv ON ec.electionId = bv.election AND ec.listnum = bv.listnum
      WHERE 
        ec.electionId = $1
      GROUP BY 
        c.firstname, c.lastname
      ORDER BY 
        votes DESC;
    `;

    const dbResult = await client.query(query, [electionId]);

    if (dbResult.rows.length === 0) {
      logger.warn(`No results found for electionId: ${electionId}`);
      return res.status(404).json({ message: 'No results found for this election ID.' });
    }

    // Prepare data for download
    const resultsData = {
      electionId: electionId,
      totalVotes: dbResult.rows.reduce((sum, row) => sum + parseInt(row.votes, 10), 0),
      results: dbResult.rows,
    };

    // Set headers for file download
    const fileName = `election-total-results-${electionId}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    logger.debug(`Successfully exporting total results for electionId ${electionId}.`);

    // Send data as JSON file
    return res.status(200).json(resultsData);
  } catch (error) {
    logger.error('Error querying database for total results export:', error);
    next(error);
  }
};

/**
 * Route handler for exporting anonymized ballot data.
 * This route expects a GET request with an electionId as a URL parameter
 * (e.g., /download/ballots/some-uuid).
 *
 * Behavior:
 * - Validates the HTTP method.
 * - Validates the presence of the electionId.
 * - Queries the database for all individual (anonymized) votes associated with an election.
 * - This contains NO voter information, only the link between a ballot and a candidate.
 * - Sends a JSON file as a download.
 *
 * @async
 * @param {Object} req - The Express request object
 * @param {Object} res - The Express response object
 * @param {Function} next - The Express next middleware function
 * @returns {Promise<Response>} JSON file download or JSON error response
 */
export const exportBallotsRoute = async (req, res, next) => {
  logger.debug('Export route for anonymized ballots accessed');

  // Validate HTTP method
  if (req.method !== 'GET') {
    logger.warn(`Invalid HTTP method used: ${req.method}`);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Validate parameter
  const { electionId } = req.params;
  if (!electionId) {
    logger.warn('No electionId provided in the request');
    return res.status(400).json({ message: 'electionId is required' });
  }

  try {
    // Query for anonymized ballot votes
    // We select the ballot ID and the candidate ID it voted for.
    const query = `
      SELECT 
        bv.ballot AS "ballotId",
        ec.candidateId AS "candidateId",
      FROM 
        ballotvotes bv
      JOIN
        electioncandidates ec ON bv.election = ec.electionId AND bv.listnum = ec.listnum
      WHERE 
        bv.election = $1;
    `;

    const dbResult = await client.query(query, [electionId]);

    if (dbResult.rows.length === 0) {
      logger.warn(`No ballots found for electionId: ${electionId}`);
      return res.status(404).json({ message: 'No ballots found for this election ID.' });
    }

    // Set headers for file download
    const fileName = `election-anonymized-ballots-${electionId}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    logger.debug(`Successfully exporting anonymized ballots for electionId ${electionId}.`);

    // Send the raw rows as the file
    return res.status(200).json(dbResult.rows);
  } catch (error) {
    logger.error('Error querying database for ballot export:', error);
    next(error);
  }
};
