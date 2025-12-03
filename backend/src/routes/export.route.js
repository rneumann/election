import express from 'express';
import { logger } from '../conf/logger/logger.js';
import { generateElectionResultExcel } from '../service/result-exporter.js';

const router = express.Router();

// Constants
const RESULT_ID_SUBSTRING_LENGTH = 8;

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
router.get('/election-result/:resultId', async (req, res) => {
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

export default router;
