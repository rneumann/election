import { Router } from 'express';
import { logger } from '../conf/logger/logger.js';
import { ensureAuthenticated, ensureHasRole } from '../auth/auth.js';
import { getAllCandidates } from '../service/candidate.service.js';
import { importCandidateRoute } from '../service/upload.service.js';

export const candidateRouter = Router();

/**
 * @openapi
 * /api/candidates:
 *   get:
 *     summary: Get candidate directory
 *     description: Retrieves a complete list of all candidates stored in the system with details like faculty and image.
 *     tags:
 *       - Elections
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: A list of candidates.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                     description: The unique identifier of the candidate.
 *                   Lastname:
 *                     type: string
 *                     description: The last name of the candidate.
 *                     example: "Mustermann"
 *                   Firstname:
 *                     type: string
 *                     description: The first name of the candidate.
 *                     example: "Max"
 *                   Fakultät:
 *                     type: string
 *                     description: The faculty the candidate belongs to.
 *                     example: "Informatik"
 *                   Notizen:
 *                     type: string
 *                     nullable: true
 *                     description: Additional notes or biography.
 *                   Bild:
 *                     type: string
 *                     nullable: true
 *                     description: Base64 encoded image or URL.
 *       401:
 *         description: Unauthorized. User must be authenticated.
 *       500:
 *         description: Internal server error.
 */

candidateRouter.get('/', ensureAuthenticated, async (req, res, next) => {
  try {
    const candidates = await getAllCandidates();
    logger.debug(`Candidates retrieved: ${candidates.length} entries`);
    res.json(candidates);
  } catch (error) {
    logger.error(`Error fetching candidates: ${error.message}`);
    next(error);
  }
});
