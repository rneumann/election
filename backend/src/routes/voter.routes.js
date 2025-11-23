import { Router } from 'express';
import { logger } from '../conf/logger/logger.js';
import { getElectionById, getElections } from '../service/voter.service.js';

export const voterRouter = Router();

/**
 * @openapi
 * /api/voter/elections:
 *  get:
 *    summary: Get all elections
 *    description: Get all elections, that are currently active
 *    tags:
 *      - Elections
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
 *      404:
 *        description: No elections found
 *      405:
 *        description: Method Not Allowed
 *      500:
 *        description: Internal Server Error
 */
voterRouter.get('/elections', async (req, res) => {
  logger.debug('Election route accessed');
  if (req.method !== 'GET') {
    logger.warn(`Invalid HTTP method: ${req.method}`);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const status = req.query.status;
  if (status !== 'active' && status !== 'finished' && status !== 'future' && status !== undefined) {
    logger.warn(`Invalid status parameter: ${status}`);
    return res.status(400).json({ message: 'Invalid status parameter' });
  }
  const { ok, data } = await getElections(status);

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
});

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
voterRouter.get('/elections/:id', async (req, res) => {
  const id = req.params.id;
  logger.debug(`Election route accessed with id: ${id}`);
  if (req.method !== 'GET') {
    logger.warn(`Invalid HTTP method: ${req.method}`);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
  if (!id || id === 'undefined') {
    logger.warn('Election id is missing');
    return res.status(400).json({ message: 'Election id is required' });
  }
  const { ok, data } = await getElectionById(req.params.id);
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
});
