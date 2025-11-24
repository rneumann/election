import { Router } from 'express';
import { logger } from '../conf/logger/logger.js';
import { getElectionById, getElections, getVoterById } from '../service/voter.service.js';
import { ensureAuthenticated, ensureHasRole } from '../auth/auth.js';

export const voterRouter = Router();

/**
 * @openapi
 *
 *  get:
 *    summary: Get all elections
 *    description: Get all elections, that are currently active
 *    tags:
 *      - Elections
 *    parameters:
 *      - name: status
 *        in: query
 *        description: Status of the election
 *        required: false
 *        schema:
 *          type: string
 *          enum: [active, finished, future]
 *        example: active
 *    responses:
 *      200:
 *        description: OK
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                elections:
 *                  type: array
 *                  items:
 *                    type: object
 *                    properties:
 *                      id:
 *                        type: string
 *                      info:
 *                        type: string
 *                      description:
 *                        type: string
 *                      voters_per_ballot:
 *                        type: number
 *                      start:
 *                        type: string
 *                      end:
 *                        type: string
 *                      candidates:
 *                        type: number
 *                      voters:
 *                        type: number
 *                      ballots:
 *                        type: number
 *      400:
 *        description: Invalid status parameter
 *      404:
 *        description: No elections found
 *      405:
 *        description: Method Not Allowed
 *      500:
 *        description: Internal Server Error
 */
voterRouter.get(
  '/:voterId/elections',
  ensureAuthenticated,
  ensureHasRole(['admin', 'voter', 'committee']),
  async (req, res) => {
    logger.debug('Election route accessed');
    const voterId = req.params.voterId;

    if (req.method !== 'GET') {
      logger.warn(`Invalid HTTP method: ${req.method}`);
      return res.status(405).json({ message: 'Method Not Allowed' });
    }
    const status = req.query.status;
    if (
      status !== 'active' &&
      status !== 'finished' &&
      status !== 'future' &&
      status !== undefined
    ) {
      logger.warn(`Invalid status parameter: ${status}`);
      return res.status(400).json({ message: 'Invalid status parameter' });
    }

    if (!voterId) {
      logger.warn('Voter id is required');
      return res.status(400).json({ message: 'Voter id is required' });
    }

    const response = await getVoterById(voterId);
    if (!response.ok) {
      logger.warn('Voter not found');
      return res.status(404).json({ message: 'Voter not found' });
    }
    logger.debug(`Voter retrieved successfully res: ${JSON.stringify(response.data)}`);
    const { ok, data } = await getElections(
      status,
      response.data.faculty,
      response.data.votergroup,
    );

    if (!ok) {
      logger.error('Error retrieving elections');
      return res.status(500).json({ message: 'Error retrieving elections' });
    }
    if (data.length === 0) {
      logger.warn('No elections found');
      return res.status(404).json({ message: 'No elections found' });
    }
    logger.debug(`Elections retrieved successfully res: ${JSON.stringify(data)}`);
    res.status(200).json(data);
  },
);

/**
 * @openapi
 * /api/voter/elections/{id}:
 *  get:
 *    summary: Get election by id
 *    description: Get election by id
 *    tags:
 *      - Elections
 *    parameters:
 *      - name: id
 *        in: path
 *        description: ID of the election
 *        required: true
 *        schema:
 *          type: string
 *    responses:
 *      200:
 *        description: OK
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                id:
 *                  type: string
 *                info:
 *                  type: string
 *                description:
 *                  type: string
 *                voters_per_ballot:
 *                  type: number
 *                start:
 *                  type: string
 *                end:
 *                  type: string
 *                candidates:
 *                  type: array
 *                  items:
 *                    type: object
 *                    properties:
 *                      candidateId:
 *                        type: string
 *                      lastname:
 *                        type: string
 *                      firstname:
 *                        type: string
 *                      mtknr:
 *                        type: string
 *                      faculty:
 *                        type: string
 *                      listnum:
 *                        type: number
 *      400:
 *        description: Election id is required
 *      404:
 *        description: No election found
 *      405:
 *        description: Method Not Allowed
 *      500:
 *        description: Internal Server Error
 */
voterRouter.get(
  '/elections/:electionId',
  ensureAuthenticated,
  ensureHasRole(['admin', 'voter', 'committee']),
  async (req, res) => {
    logger.debug(`Election route accessed with id: ${req.params.electionId}`);

    const electionId = req.params.electionId;
    if (req.method !== 'GET') {
      logger.warn(`Invalid HTTP method: ${req.method}`);
      return res.status(405).json({ message: 'Method Not Allowed' });
    }
    if (!electionId) {
      logger.warn('Election id is required');
      return res.status(400).json({ message: 'Election id is required' });
    }

    const { ok, data } = await getElectionById(electionId);
    if (!ok) {
      logger.error('Error retrieving election');
      return res.status(500).json({ message: 'Error retrieving election' });
    }
    if (data.length === 0) {
      logger.warn('No election found');
      return res.status(404).json({ message: 'No election found' });
    }
    logger.debug(`Election retrieved successfully res: ${JSON.stringify(data)}`);
    res.status(200).json(data);
  },
);
