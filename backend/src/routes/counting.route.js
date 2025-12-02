import { Router } from 'express';
import { logger } from '../conf/logger/logger.js';
import { ensureAuthenticated, ensureHasRole } from '../auth/auth.js';
import { performCounting, getResults, finalizeResults } from '../counting/counting.service.js';

export const countingRouter = Router();

// Constants for error messages
const ERROR_INVALID_ELECTION_ID = 'Election ID is required and must be a valid string';
const ERROR_INVALID_VERSION = 'Version is required and must be a positive integer';
const LOG_INVALID_ELECTION_ID = 'Invalid electionId parameter';

/**
 * @openapi
 * /api/counting/{electionId}/count:
 *   post:
 *     summary: Perform vote counting for an election
 *     description: |
 *       Executes the counting algorithm for a completed election.
 *
 *       Process:
 *       1. Validates election state (ended, configured, not finalized)
 *       2. Loads aggregated vote data (BSI-compliant)
 *       3. Executes appropriate counting algorithm
 *       4. Stores results with version control
 *       5. Returns counting summary
 *
 *       Supports all election types:
 *       - Studierendenparlament (Sainte-Laguë / Highest Votes)
 *       - Fachschaftsvorstand (Highest Votes with majority check)
 *       - Urabstimmung (Referendum Yes/No)
 *       - Senat (Hare-Niemeyer / Highest Votes)
 *       - Fakultätsrat (Hare-Niemeyer / Highest Votes)
 *       - Prorektor:innen (Referendum with absolute majority)
 *       - Dekane (Highest Votes with majority check)
 *       - Prodekane (Highest Votes with majority check)
 *       - Professorenwahl (Highest Votes)
 *     tags:
 *       - Counting
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: electionId
 *         in: path
 *         description: UUID of the election to count
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Counting completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Vote counting completed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     result_id:
 *                       type: string
 *                       format: uuid
 *                       description: UUID of stored result
 *                     version:
 *                       type: integer
 *                       description: Version number (increments on re-count)
 *                       example: 1
 *                     ties_detected:
 *                       type: boolean
 *                       description: Whether algorithm detected ties
 *                       example: false
 *                     counted_at:
 *                       type: string
 *                       format: date-time
 *                       description: ISO timestamp of counting
 *                     algorithm:
 *                       type: string
 *                       description: Algorithm used for counting
 *                       enum: [sainte_lague, hare_niemeyer, highest_votes_absolute, highest_votes_simple, yes_no_referendum]
 *                       example: "highest_votes_absolute"
 *       400:
 *         description: Validation error (election not ended, already finalized, etc.)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Election has not ended yet. Counting before election end is not permitted (BSI requirement)."
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions (requires admin or committee role)
 *       404:
 *         description: Election not found
 *       500:
 *         description: Internal server error during counting
 */
countingRouter.post(
  '/:electionId/count',
  ensureAuthenticated,
  ensureHasRole(['admin', 'committee']),
  async (req, res) => {
    const { electionId } = req.params;
    const userId = req.user?.username || 'unknown';

    logger.info(`Counting request received for election ${electionId} by user ${userId}`);

    // Validate electionId
    if (!electionId || typeof electionId !== 'string') {
      logger.warn('Invalid electionId parameter');
      return res.status(400).json({
        success: false,
        message: 'Election ID is required and must be a valid string',
      });
    }

    try {
      // Perform counting
      const result = await performCounting(electionId, userId);

      logger.info(
        `Counting successful for election ${electionId}: version=${result.version}, ties=${result.ties_detected}`,
      );

      return res.status(200).json({
        success: true,
        message: 'Vote counting completed successfully',
        data: result,
      });
    } catch (error) {
      logger.error(`Counting failed for election ${electionId}: ${error.message}`);

      // Distinguish validation errors from system errors
      const isValidationError =
        error.message.includes('not ended') ||
        error.message.includes('not found') ||
        error.message.includes('already finalized') ||
        error.message.includes('not configured');

      return res.status(isValidationError ? 400 : 500).json({
        success: false,
        message: error.message,
      });
    }
  },
);

/**
 * @openapi
 * /api/counting/{electionId}/results:
 *   get:
 *     summary: Retrieve counting results for an election
 *     description: |
 *       Fetches stored counting results for a specific election.
 *       Can retrieve either the latest version or a specific version.
 *
 *       Results include:
 *       - Algorithm used
 *       - Elected candidates / referendum outcome
 *       - Vote counts and percentages
 *       - Tie detection information
 *       - Majority check results (for applicable election types)
 *       - Ballot statistics (valid/invalid)
 *     tags:
 *       - Counting
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: electionId
 *         in: path
 *         description: UUID of the election
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: version
 *         in: query
 *         description: Specific version to retrieve (omit for latest)
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 1
 *     responses:
 *       200:
 *         description: Results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Results retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     result_id:
 *                       type: string
 *                       format: uuid
 *                     election_id:
 *                       type: string
 *                       format: uuid
 *                     version:
 *                       type: integer
 *                       example: 1
 *                     result_data:
 *                       type: object
 *                       description: JSONB data from counting algorithm
 *                     is_final:
 *                       type: boolean
 *                       description: Whether result is finalized
 *                     counted_by:
 *                       type: string
 *                       description: Username who triggered counting
 *                     counted_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: No results found for election/version
 *       500:
 *         description: Internal server error
 */
countingRouter.get(
  '/:electionId/results',
  ensureAuthenticated,
  ensureHasRole(['admin', 'committee']),
  async (req, res) => {
    const { electionId } = req.params;
    const versionParam = req.query.version;

    logger.info(`Results request for election ${electionId}, version=${versionParam || 'latest'}`);

    // Validate electionId
    if (!electionId || typeof electionId !== 'string') {
      logger.warn(LOG_INVALID_ELECTION_ID);
      return res.status(400).json({
        success: false,
        message: ERROR_INVALID_ELECTION_ID,
      });
    }

    // Parse and validate version parameter
    let version = null;
    if (versionParam !== undefined) {
      version = parseInt(versionParam, 10);
      if (isNaN(version) || version < 1) {
        logger.warn(`Invalid version parameter: ${versionParam}`);
        return res.status(400).json({
          success: false,
          message: ERROR_INVALID_VERSION,
        });
      }
    }

    try {
      const results = await getResults(electionId, version);

      if (!results) {
        logger.warn(`No results found for election ${electionId}, version=${version || 'latest'}`);
        return res.status(404).json({
          success: false,
          message: 'No results found for this election/version',
        });
      }

      logger.info(`Results retrieved for election ${electionId}: version=${results.version}`);

      return res.status(200).json({
        success: true,
        message: 'Results retrieved successfully',
        data: results,
      });
    } catch (error) {
      logger.error(`Error retrieving results for election ${electionId}: ${error.message}`);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
);

/**
 * @openapi
 * /api/counting/{electionId}/finalize:
 *   post:
 *     summary: Finalize election results
 *     description: |
 *       Marks a specific result version as final, preventing further counting.
 *
 *       Once finalized:
 *       - No further counting allowed for this election
 *       - Result becomes official and immutable
 *       - Used after manual tie-break resolution or committee approval
 *
 *       Use case: Admin reviews results, resolves any ties manually (e.g., drawing lots),
 *       then finalizes to lock the official outcome.
 *     tags:
 *       - Counting
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: electionId
 *         in: path
 *         description: UUID of the election
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - version
 *             properties:
 *               version:
 *                 type: integer
 *                 minimum: 1
 *                 description: Version number to finalize
 *                 example: 1
 *     responses:
 *       200:
 *         description: Results finalized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Results finalized successfully"
 *       400:
 *         description: Validation error (already finalized, version not found, etc.)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Election results are already finalized"
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions (requires admin or committee role)
 *       404:
 *         description: Election or version not found
 *       500:
 *         description: Internal server error
 */
countingRouter.post(
  '/:electionId/finalize',
  ensureAuthenticated,
  ensureHasRole(['admin', 'committee']),
  async (req, res) => {
    const { electionId } = req.params;
    const { version } = req.body;
    const userId = req.user?.username || 'unknown';

    logger.info(`Finalize request for election ${electionId}, version=${version} by ${userId}`);

    // Validate electionId
    if (!electionId || typeof electionId !== 'string') {
      logger.warn(LOG_INVALID_ELECTION_ID);
      return res.status(400).json({
        success: false,
        message: ERROR_INVALID_ELECTION_ID,
      });
    }

    // Validate version
    if (!version || !Number.isInteger(version) || version < 1) {
      logger.warn(`Invalid version parameter: ${version}`);
      return res.status(400).json({
        success: false,
        message: ERROR_INVALID_VERSION,
      });
    }

    try {
      await finalizeResults(electionId, version, userId);

      logger.info(`Results finalized for election ${electionId}, version=${version}`);

      return res.status(200).json({
        success: true,
        message: 'Results finalized successfully',
      });
    } catch (error) {
      logger.error(`Finalization failed for election ${electionId}: ${error.message}`);

      // Distinguish validation errors from system errors
      const isValidationError =
        error.message.includes('not found') ||
        error.message.includes('already finalized') ||
        error.message.includes('No result found');

      return res.status(isValidationError ? 400 : 500).json({
        success: false,
        message: error.message,
      });
    }
  },
);
