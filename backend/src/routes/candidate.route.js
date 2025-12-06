import { Router } from 'express';
import multer from 'multer';
import { logger } from '../conf/logger/logger.js';
import { ensureAuthenticated, ensureHasRole } from '../auth/auth.js';
import {
  checkIfCandidateAlreadyHasInfo,
  deleteCandidateInformation,
  getAllCandidates,
  updateCandidateInformation,
  uploadCandidateInformation,
} from '../service/candidate.service.js';
import { candidateInfoSchema } from '../schemas/candidate-info.js';

export const candidateRouter = Router();

const mB = 5;
const kB = 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: mB * kB * kB },
});

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

/**
 * @openapi
 * /api/candidates/information:
 *   post:
 *     summary: Upload candidate information
 *     description: Allows a candidate to upload their information and picture.
 *     tags:
 *       - Candidates
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: header
 *         name: X-CSRF-Token
 *         required: true
 *         description: CSRF token for security.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               info:
 *                 type: string
 *                 description: Additional information about the candidate.
 *               picture:
 *                 type: string
 *                 format: binary
 *                 description: The candidate's picture file.
 *     responses:
 *       201:
 *         description: Candidate information uploaded successfully.
 *       400:
 *         description: Bad request. Validation errors.
 *       403:
 *         description: Forbidden. User is not a candidate.
 *       409:
 *         description: Conflict. Candidate information already exists.
 *       500:
 *         description: Internal server error.
 */
candidateRouter.post(
  '/information', // eslint-disable-line
  ensureAuthenticated,
  ensureHasRole(['voter']),
  upload.single('picture'),
  async (req, res) => {
    logger.debug(
      `Uploading candidate information for user ${req.user.username} eith infos: ${JSON.stringify(req.body)}, file: ${req.file?.originalname}`,
    );
    if (!req.user.username) {
      logger.warn(`User is not authenticated attempted to upload candidate information.`);
      return res
        .status(403)
        .json({ message: 'Forbidden: Cannot upload information for another user.' });
    }

    const alreadyHasInfo = await checkIfCandidateAlreadyHasInfo(req.user.username);
    if (alreadyHasInfo) {
      logger.warn(
        `User ${req.user.username} attempted to upload candidate information but already has information stored.`,
      );
      return res.status(409).json({ message: 'Conflict: Candidate information already exists.' });
    }

    const candidateInfo = candidateInfoSchema.safeParse({
      candidate_uid: req.user.username,
      info: req.body.info,
      picture_content_type: req.file?.mimetype,
      picture_data: req.file?.buffer,
    });

    const isCandidate = req.user.isCandidate;
    if (!isCandidate) {
      logger.warn(
        `User ${req.user.username} attempted to upload candidate information without being a candidate.`,
      );
      return res.status(403).json({ message: 'Forbidden: User is not a candidate.' }); // eslint-disable-line
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

/**
 * @openapi
 * /api/candidates/information/{voterUid}:
 *   put:
 *     summary: Update candidate information
 *     description: Allows a candidate to update their information and picture.
 *     tags:
 *       - Candidates
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: header
 *         name: X-CSRF-Token
 *         required: true
 *         description: CSRF token for security.
 *       - in: path
 *         name: voterUid
 *         required: true
 *         description: The unique identifier of the candidate.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               info:
 *                 type: string
 *                 description: Additional information about the candidate.
 *               picture:
 *                 type: string
 *                 format: binary
 *                 description: The candidate's picture file.
 *     responses:
 *       200:
 *         description: Candidate information updated successfully.
 *       400:
 *         description: Bad request. Validation errors.
 *       403:
 *         description: Forbidden. User is not a candidate.
 *       404:
 *         description: Not Found. Candidate information does not exist yet.
 *       500:
 *         description: Internal server error.
 */
candidateRouter.put(
  '/information',
  ensureAuthenticated,
  ensureHasRole(['voter']),
  upload.single('picture'),
  async (req, res) => {
    logger.debug(
      `Updating candidate information for user ${req.user.username} eith infos: ${JSON.stringify(req.body)}, file: ${req.file?.originalname}`,
    );
    if (!req.user.username) {
      logger.warn(`Not authenticated user attempted to update candidate information.`);
      return res
        .status(403)
        .json({ message: 'Forbidden: Cannot update information for another user.' });
    }

    const infoAlreadyExists = await checkIfCandidateAlreadyHasInfo(req.user.username);
    if (!infoAlreadyExists) {
      logger.warn(
        `User ${req.user.username} attempted to update candidate information but has no information stored yet.`,
      );
      return res
        .status(404)
        .json({ message: 'Not Found: Candidate information does not exist yet.' });
    }

    const candidateInfo = candidateInfoSchema.safeParse({
      candidate_uid: req.user.username,
      info: req.body.info,
      picture_content_type: req.file?.mimetype,
      picture_data: req.file?.buffer,
    });

    const isCandidate = req.user.isCandidate;
    if (!isCandidate) {
      logger.warn(
        `User ${req.user.username} attempted to update candidate information without being a candidate.`,
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
      await updateCandidateInformation(candidateInfo.data);
    } catch (error) {
      logger.error(`Error updating candidate information: ${error.message}`);
      return res.status(500).json({ message: 'Database update operation failed.' });
    }
    res.sendStatus(204);
  },
);

/**
 * @openapi
 * /api/candidates/information:
 *   delete:
 *     summary: Delete candidate information
 *     description: Allows a candidate to delete their information and picture.
 *     tags:
 *       - Candidates
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: header
 *         name: X-CSRF-Token
 *         required: true
 *         description: CSRF token for security.
 *     responses:
 *       204:
 *         description: Candidate information deleted successfully.
 *       403:
 *         description: Forbidden. User is not a candidate.
 *       404:
 *         description: Not Found. Candidate information does not exist yet.
 *       500:
 *         description: Internal server error.
 */
candidateRouter.delete(
  '/information',
  ensureAuthenticated,
  ensureHasRole(['voter']),
  async (req, res) => {
    if (!req.user.username) {
      logger.warn(`Not authenticated user attempted to update candidate information.`);
      return res
        .status(403)
        .json({ message: 'Forbidden: Cannot update information for another user.' });
    }

    const infoAlreadyExists = await checkIfCandidateAlreadyHasInfo(req.user.username);
    if (!infoAlreadyExists) {
      logger.warn(
        `User ${req.user.username} attempted to update candidate information but has no information stored yet.`,
      );
      return res
        .status(404)
        .json({ message: 'Not Found: Candidate information does not exist yet.' });
    }

    const isCandidate = req.user.isCandidate;
    if (!isCandidate) {
      logger.warn(
        `User ${req.user.username} attempted to update candidate information without being a candidate.`,
      );
      return res.status(403).json({ message: 'Forbidden: User is not a candidate.' });
    }

    try {
      const result = await deleteCandidateInformation(req.user.username);
      if (result) {
        res.sendStatus(204);
      } else {
        logger.error(`Failed to delete candidate information for user ${req.user.username}.`);
        res.status(500).json({ message: 'Database delete operation failed.' });
      }
    } catch (error) {
      logger.error(`Error deleting candidate information: ${error.message}`);
      {
        res.status(500).json({ message: 'Database delete operation failed.' });
      }
    }
  },
);
