import express from 'express';
import { ensureAuthenticated, ensureHasRole } from '../auth/auth.js';
import { logger } from '../conf/logger/logger.js';
import { getElectionById } from '../service/voter.service.js';
import {
  controlTestElection,
  deleteAllData,
  deleteAllElectionData,
  getElectionsForAdmin,
  resetElectionData,
} from '../service/admin.service.js';

export const adminRouter = express.Router();

// Constants
const ERROR_INTERNAL_SERVER = 'Internal Server Error';

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
adminRouter.get('/elections', ensureAuthenticated, ensureHasRole(['admin']), async (req, res) => {
  const { status } = req.query;

  if (status && !['active', 'finished', 'future'].includes(status)) {
    logger.warn(`Invalid status parameter: ${status}`);
    return res.status(400).json({ message: 'Invalid status parameter' });
  }

  try {
    const elections = await getElectionsForAdmin(status);
    logger.debug(`Admin elections retrieved: ${elections.length}`);
    res.status(200).json(elections);
  } catch (error) {
    logger.error(`Failed to retrieve admin elections: ${error.message}`);
    res.status(500).json({ message: ERROR_INTERNAL_SERVER });
  }
});

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
      if (
        (currentTime > new Date(election.start) && currentTime < new Date(election.end)) ||
        currentTime > new Date(election.end)
      ) {
        logger.warn(
          'Election is active or finished, you cannot control test election during an active or finished election',
        );
        return res
          .status(400)
          .json({ message: 'Election is active or finished, control is not possible!' });
      }

      await controlTestElection(electionId);
      logger.debug(`Test election status toggled for election ID: ${electionId}`);
      return res.sendStatus(204);
    } catch (error) {
      logger.debug(`Failed to reset election data for ${electionId}: ${error.message}`);
      logger.error(`Failed to reset election data for ${electionId}`);
      return res.status(500).json({ message: ERROR_INTERNAL_SERVER });
    }
  },
);

/**
 * @openapi
 * /api/admin/resetElectionData/{electionId}:
 *   delete:
 *     summary: Reset election data (Admin only)
 *     description: Resets the election data for the specified election ID
 *     tags:
 *       - Admin
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: electionId
 *         in: path
 *         description: The ID of the election to reset
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Election data reset successfully
 *       400:
 *         description: Bad request (election is active)
 *       404:
 *         description: Election not found
 *       500:
 *         description: Internal server error
 */
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
        return res.status(400).json({ message: 'Election is active, reset is not possible!' });
      }
      await resetElectionData(electionId);
      logger.debug(`Election data reset for election ID: ${electionId}`);
      return res.sendStatus(204);
    } catch (error) {
      logger.debug(`Failed to reset election data for ${electionId}: ${error.message}`);
      logger.error(`Failed to reset election data for ${electionId}`);
      return res.status(500).json({ message: ERROR_INTERNAL_SERVER });
    }
  },
);

adminRouter.delete(
  '/deleteAllData',
  ensureAuthenticated,
  ensureHasRole(['admin']),
  async (req, res) => {
    logger.debug('Election route for admin accessed to delete all data');
    const electionId = req.query?.electionId;
    if (!electionId) {
      logger.info('Delete all data!');
      try {
        await deleteAllData(req.user?.username || 'system', req.user?.role || 'admin');
        logger.debug('All data deleted successfully');
        res.sendStatus(204);
      } catch (error) {
        logger.debug(`Failed to delete all data: ${error.message}`);
        logger.error('Failed to delete all data');
        res.status(500).json({ message: ERROR_INTERNAL_SERVER });
      }
    } else {
      logger.info(`Delete data for election ID: ${electionId}`);
      try {
        const election = await getElectionById(electionId);
        if (!election) {
          logger.warn('Election not found');
          return res.status(404).json({ message: 'Election not found' });
        }
        await deleteAllElectionData(
          electionId,
          req.user?.username || 'system',
          req.user?.role || 'admin',
        );
        logger.debug(`Election data reset for election ID: ${electionId}`);
        res.sendStatus(204);
      } catch (error) {
        logger.debug(`Failed to reset election data for ${electionId}: ${error.message}`);
        logger.error(`Failed to reset election data for ${electionId}`);
        res.status(500).json({ message: ERROR_INTERNAL_SERVER });
      }
    }
  },
);
