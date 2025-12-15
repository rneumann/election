import express from 'express';
import { ensureAuthenticated, ensureHasRole } from '../auth/auth.js';
import { logger } from '../conf/logger/logger.js';
import { getElectionById } from '../service/voter.service.js';
import { controlTestElection, resetElectionData } from '../service/admin.service.js';

export const adminRouter = express.Router();

adminRouter.post(
  '/controlTestElection/:electionId',
  ensureAuthenticated,
  ensureHasRole(['admin']),
  async (req, res) => {
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
      return res.status(200).json({ message: 'Test election status toggled successfully' });
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
      return res.status(200).json({ message: 'Election data reset successfully' });
    } catch (error) {
      logger.debug(`Failed to reset election data for ${electionId}: ${error.message}`);
      logger.error(`Failed to reset election data for ${electionId}`);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  },
);
