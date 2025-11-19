import { Router } from 'express';
import { logger } from '../conf/logger/logger.js';
import { getElections } from '../service/voter.service.js';

export const voterRouter = Router();

/**
 * @openapi
 * /voter/elections:
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

  const { ok, data } = await getElections();

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
