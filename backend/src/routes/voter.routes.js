import { Router } from 'express';
import { logger } from '../conf/logger/logger.js';
import {
  checkAlreadyVoted,
  checkIfCandidateIsValid,
  checkIfNumberOfVotesIsValid,
  createBallot,
  getElectionById,
  getElections,
  getVoterById,
} from '../service/voter.service.js';
import { ensureAuthenticated, ensureHasRole } from '../auth/auth.js';
import { ballotInputSchema } from '../schemas/ballot.js';

export const voterRouter = Router();

/**
 * @openapi
 * /api/voter/{voterId}/elections:
 *   get:
 *     summary: Get elections by voter id, requires authentication as voter, committee or admin
 *     description: Get elections by voter id
 *     tags:
 *       - Elections
 *     parameters:
 *       - in: header
 *         name: X-CSRF-Token
 *         required: true
 *         description: CSRF token for security.
 *       - name: voterId
 *         in: path
 *         description: ID of the voter
 *         required: true
 *         schema:
 *           type: string
 *       - name: status
 *         in: query
 *         description: Status of the election (optional)
 *         required: false
 *         schema:
 *           type: string
 *           enum: [active, finished, future]
 *       - name: alreadyVoted
 *         in: query
 *         description: Whether to retrieve elections which the voter has already voted in (optional)
 *         required: false
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 elections:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       info:
 *                         type: string
 *                       description:
 *                         type: string
 *                       voters_per_ballot:
 *                         type: number
 *                       start:
 *                         type: string
 *                       end:
 *                         type: string
 *                       candidates:
 *                         type: number
 *                       voters:
 *                         type: number
 *                       ballots:
 *                         type: number
 *       400:
 *         description: Invalid status parameter
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No elections found
 *       405:
 *         description: Method Not Allowed
 *       500:
 *         description: Internal Server Error
 */
voterRouter.get(
  '/:voterUid/elections',
  ensureAuthenticated,
  ensureHasRole(['admin', 'voter', 'committee']),
  async (req, res) => {
    logger.debug('Election route accessed');
    const voterUid = req.params.voterUid;
    const status = req.query.status;
    const alreadyVoted = req.query.alreadyVoted === 'true';
    if (
      status !== 'active' &&
      status !== 'finished' &&
      status !== 'future' &&
      status !== undefined
    ) {
      logger.warn(`Invalid status parameter: ${status}`);
      return res.status(400).json({ message: 'Invalid status parameter' });
    }

    if (!voterUid) {
      logger.warn('Voter id is required');
      return res.status(400).json({ message: 'Voter id is required' });
    }
    try {
      const voter = await getVoterById(voterUid);
      if (!voter) {
        // eslint-disable-next-line
        logger.warn('Voter not found');
        return res.status(404).json({ message: 'Voter not found' });
      }
      logger.debug(`Voter retrieved successfully res: ${JSON.stringify(voter)}`);

      const elections = await getElections(status, voter.id, alreadyVoted);

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

/**
 * @openapi
 * /api/voter/elections/{id}:
 *  get:
 *    summary: Get election by id
 *    description: Get election by id
 *    tags:
 *      - Elections
 *    parameters:
 *      - in: header
 *        name: X-CSRF-Token
 *        required: true
 *        description: CSRF token for security.
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
    if (!electionId) {
      logger.warn('Election id is required');
      return res.status(400).json({ message: 'Election id is required' });
    }
    try {
      const election = await getElectionById(electionId);
      if (!election) {
        logger.warn('Error retrieving election');
        return res.status(404).json({ message: 'Error retrieving election' });
      }
      logger.debug(`Election retrieved successfully res: ${JSON.stringify(election)}`);
      res.status(200).json(election);
    } catch {
      res.status(500).json({ message: 'Internal Server Error' });
    }
  },
);

/**
 * @openapi
 * /api/voter/{voterId}/ballot:
 *  post:
 *    summary: Create a new ballot for a given election and voter
 *    description: Create a new ballot for a given election and voter
 *    tags:
 *      - Ballots
 *    parameters:
 *      - in: header
 *        name: X-CSRF-Token
 *        required: true
 *        description: CSRF token for security.
 *      - name: voterId
 *        in: path
 *        description: ID of the voter
 *        required: true
 *        schema:
 *          type: string
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - electionId
 *              - valid
 *              - votes
 *              - listnum
 *            properties:
 *              electionId:
 *                type: string
 *              valid:
 *                type: boolean
 *              voteDecision:
 *                type: array
 *                items:
 *                  type: object
 *                  properties:
 *                    votes:
 *                      type: number
 *                    listnum:
 *                      type: number
 *    responses:
 *      201:
 *        description: Created
 *      400:
 *        description: Invalid request body
 *      401:
 *        description: Unauthorized
 *      404:
 *        description: Voter not found
 *      405:
 *        description: Method Not Allowed
 *      409:
 *        description: Ballot already exists
 *      415:
 *        description: Content-Type must be application/json
 *      500:
 *        description: Internal Server Error
 */
voterRouter.post(
  '/:voterUid/ballot',
  ensureAuthenticated,
  ensureHasRole(['voter']),
  async (req, res) => {
    logger.debug('Ballot route accessed');
    logger.debug(`Request body: ${JSON.stringify(req.body)}`);
    if (!req.is('application/json')) {
      logger.warn('Invalid Content-Type header');
      return res.status(415).json({ message: 'Content-Type must be application/json' });
    }

    // chack if request body is valid
    const ballotInput = ballotInputSchema.safeParse(req.body);
    if (!ballotInput.success) {
      logger.warn('Invalid request body');
      logger.debug(`Invalid request body: ${ballotInput.error.message}`);
      return res.status(400).json({ message: 'Invalid request body' });
    }

    // check if candidate is valid
    for (const cand of req.body.voteDecision) {
      const candidateIsValid = await checkIfCandidateIsValid(cand.listnum, req.body.electionId);
      if (!candidateIsValid) {
        logger.warn('Candidate is not justified for this election');
        return res.status(400).json({ message: 'Candidate is not justified for this election' });
      }
    }

    try {
      // retrieve voter-object over voterUid
      const voter = await getVoterById(req.params.voterUid);
      if (!voter) {
        logger.warn('Voter not found');
        return res.status(404).json({ message: 'Voter not found' });
      }

      // check if voter already voted
      const alreadyVoted = await checkAlreadyVoted(voter.id, req.body.electionId);
      if (alreadyVoted) {
        return res.status(409).json({ message: 'Already voted' });
      }

      // check if election is active
      const election = await getElectionById(req.body.electionId);
      if (!election) {
        logger.warn('No election found');
        return res.status(404).json({ message: 'No election found' });
      }
      // check if election is active
      const currentTime = new Date();
      if (currentTime < new Date(election.start) || currentTime > new Date(election.end)) {
        logger.warn('Election is not active');
        return res.status(400).json({ message: 'Election is not active' });
      }
      // checlk number of votes is valid
      const validVotes = checkIfNumberOfVotesIsValid(
        req.body,
        election.max_cumulative_votes,
        election.votes_per_ballot,
      );
      if (!validVotes) {
        logger.warn('Number of votes is not valid');
        return res.status(400).json({ message: 'Number of votes is not valid' });
      }
      // start creation process
      const ballot = await createBallot(req.body, voter);
      if (!ballot) {
        logger.error('Error creating ballot');
        return res.status(500).json({ message: 'Error creating ballot' });
      }
      logger.debug(`Ballot created successfully res: ${JSON.stringify(ballot)}`);
      res.sendStatus(201);
    } catch (err) {
      logger.error('Internal Server Error');
      logger.debug(err.stack);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  },
);
