import { Router } from 'express';
import { ca } from 'zod/locales';
import { logger } from '../conf/logger/logger.js';
import { ensureAuthenticated, ensureHasRole } from '../auth/auth.js';
import { getAllCandidates, uploadCandidateInformation } from '../service/candidate.service.js';
import { candidateInfoSchema } from '../schemas/candidate-info.js';
import { checkIfCandidateIsValid } from '../service/voter.service.js';

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

candidateRouter.post(
  '/information',
  ensureAuthenticated,
  ensureHasRole(['voter']),
  async (req, res) => {
    const candidateInfo = candidateInfoSchema.safeParse({
      candidate_id: req.body.candidate_id,
      info: req.body.info,
      picture_content_type: req.file?.mimetype,
      picture_data: req.file?.buffer.toString('base64'),
    });

    const isCandidate = req.user.isCandidate;
    if (!isCandidate) {
      logger.warn(
        `User ${req.user.username} attempted to upload candidate information without being a candidate.`,
      );
      return res.status(403).json({ message: 'Forbidden: User is not a candidate.' });
    }

    if (!candidateInfo.success) {
      logger.error(
        `Candidate info validation failed: ${JSON.stringify(candidateInfo.error.issues)}`,
      );
      return res.status(400).json({ errors: candidateInfo.error.issues });
    }
    try {
      await uploadCandidateInformation(candidateInfo.data);
    } catch (error) {
      logger.error(`Error inserting candidate information: ${error.message}`);
      return res.status(500).json({ message: 'Database insert operation failed.' });
    }
    res.sendStatus(201);
  },
);
