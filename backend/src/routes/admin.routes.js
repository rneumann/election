import express from 'express';
import { ensureAuthenticated, ensureHasRole } from '../auth/auth.js';
import { logger } from '../conf/logger/logger.js';
import { getElectionById, getElections } from '../service/voter.service.js';
import {
  controlTestElection,
  getElectionsForAdmin,
  resetElectionData,
} from '../service/admin.service.js';

export const adminRouter = express.Router();

/**
 * @openapi
 * /api/admin/elections:
 *   get:
 *     summary: Get all elections (Admin only)
 *     description: Retrieves all elections with candidate and ballot counts
 *     tags:
 *       - Admin
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of all elections
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not an admin)
 *       500:
 *         description: Internal server error
 */
adminRouter.get(
  '/elections/future',
  ensureAuthenticated,
  ensureHasRole(['admin']),
  async (req, res) => {
    logger.debug('Election route for admin accessed');
    try {
      const elections = await getElectionsForAdmin();

      if (!elections || elections.length === 0) {
        logger.warn('No elections found');
        return res.status(404).json({ message: 'No elections found' });
      }

      logger.debug(`Elections retrieved successfully res: ${JSON.stringify(elections)}`);
      res.status(200).json(elections);
    } catch {
      // eslint-disable-next-line
      res.status(500).json({ message: 'Internal Server Error' });
    }
  },
);

adminRouter.put(
  '/controlTestElection/:electionId',
  ensureAuthenticated,
  ensureHasRole(['admin']),
  async (req, res) => {
    logger.debug('Election route for admin accessed to control test election');
    const electionId = req.params?.electionId;

    if (!electionId) {
      // eslint-disable-next-line
      logger.warn('Election id is required');
      return res.status(400).json({ message: 'Election id is required' });
    }

    try {
      const election = await getElectionById(electionId);
      if (!election) {
        // eslint-disable-next-line
        logger.warn('Election not found');
        return res.status(404).json({ message: 'Election not found' });
      }
      const currentTime = new Date();
      if (currentTime > new Date(election.start) && currentTime < new Date(election.end)) {
        logger.warn('Election is active, ');
        return res.status(400).json({ message: 'Election is over' });
      }

      await controlTestElection(electionId);
      logger.debug(`Test election status toggled for election ID: ${electionId}`);
      return res.sendStatus(204);
    } catch (error) {
      logger.debug(`Failed to reset election data for ${electionId}: ${error.message}`);
      logger.error(`Failed to reset election data for ${electionId}`);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  },
);

adminRouter.delete(
  '/resetElectionData/:electionId',
  ensureAuthenticated,
  ensureHasRole(['admin']),
  async (req, res) => {
    const electionId = req.params?.electionId;

    if (!electionId) {
      logger.warn('Election id is required');
      return res.status(400).json({ message: 'Election id is required' });
    }

    try {
      const election = await getElectionById(electionId);
      if (!election) {
        logger.warn('Election not found');
        return res.status(404).json({ message: 'Election not found' });
      }
      const currentTime = new Date();
      if (currentTime > new Date(election.start) && currentTime < new Date(election.end)) {
        logger.warn('Election is active, you cannot reset data during an active election');
        return res.status(400).json({ message: 'Election is active, reeset is not possible!' });
      }
      await resetElectionData(electionId);
      logger.debug(`Election data reset for election ID: ${electionId}`);
      return res.sendStatus(204);
    } catch (error) {
      logger.debug(`Failed to reset election data for ${electionId}: ${error.message}`);
      logger.error(`Failed to reset election data for ${electionId}`);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  },
);
