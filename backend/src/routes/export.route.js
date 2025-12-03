import express from 'express';
import { logger } from '../conf/logger/logger.js';
import { generateElectionResultExcel } from '../service/result-exporter.js';
import { ensureAuthenticated, ensureHasRole } from '../auth/auth.js';
import {
  exportTotalResultsRoute,
  exportBallotsRoute,
  exportElectionDefinitionRoute,
} from '../service/export.service.js';

// Constants
const RESULT_ID_SUBSTRING_LENGTH = 8;

export const exportRoute = express.Router();
/**
 * @openapi
 * /api/export/results/{electionId}:
 *   get:
 *     summary: Download anonymized ballot data
 *     tags:
 *       - Elections
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: electionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The election ID whose anonymized ballots should be exported.
 *     responses:
 *       200:
 *         description: Excel file containing anonymized ballot → candidate assignments.
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — user lacks required role
 *       404:
 *         description: No ballots found for this election ID
 *       500:
 *         description: Internal server error
 */

exportRoute.get(
  '/results/:electionId',
  ensureAuthenticated,
  ensureHasRole('admin'),
  exportBallotsRoute,
);

/**
 * @openapi
 * /api/export/totalresults/{electionId}:
 *   get:
 *     summary: Download aggregated election results (Admin/Committee only)
 *     description: Exports a complete Excel file containing all candidate vote totals for a specific election.
 *     tags:
 *       - Elections
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: electionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the election.
 *     responses:
 *       200:
 *         description: Excel file with aggregated election results.
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — user lacks required role
 *       404:
 *         description: No results found for this election ID
 *       500:
 *         description: Internal server error
 */
exportRoute.get(
  '/totalresults/:electionId',
  ensureAuthenticated,
  ensureHasRole('admin'),
  exportTotalResultsRoute,
);

/**
 * @openapi
 * /api/export/definition/{electionId}:
 *   get:
 *     summary: Download election definition
 *     description: Exports the metadata, configuration and voter group assignments for an election as an Excel file.
 *     tags:
 *       - Elections
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: electionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The election ID whose definition should be exported.
 *     responses:
 *       200:
 *         description: Excel file containing election definition and metadata.
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Election not found
 *       500:
 *         description: Internal server error
 */
exportRoute.get(
  '/definition/:electionId',
  ensureAuthenticated,
  ensureHasRole(['admin']),
  exportElectionDefinitionRoute,
);

/**
 * @swagger
 * /api/export/election-result/{resultId}:
 *   get:
 *     summary: Export election result as Excel file
 *     description: Downloads an Excel file containing complete election results including ballot statistics and detailed candidate information
 *     tags:
 *       - Export
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resultId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the election result to export
 *     responses:
 *       200:
 *         description: Excel file successfully generated
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid result ID format
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Election result not found
 *       500:
 *         description: Internal server error during export generation
 */
exportRoute.get('/election-result/:resultId', async (req, res) => {
  try {
    const { resultId } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(resultId)) {
      logger.warn(`Invalid result ID format: ${resultId}`);
      return res.status(400).json({ error: 'Invalid result ID format' });
    }

    logger.info(`Export request for election result: ${resultId}`);

    // Generate Excel file
    const buffer = await generateElectionResultExcel(resultId);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `Wahlergebnis_${resultId.substring(0, RESULT_ID_SUBSTRING_LENGTH)}_${timestamp}.xlsx`;

    // Set response headers for file download
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);

    logger.info(`Excel export sent successfully: ${filename}`);

    // Send buffer
    return res.send(buffer);
  } catch (err) {
    logger.error('Error in export route:', err);

    if (err.message.includes('not found')) {
      return res.status(404).json({ error: 'Election result not found' });
    }

    return res.status(500).json({ error: 'Failed to generate Excel export' });
  }
});
