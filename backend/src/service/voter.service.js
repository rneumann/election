import { logger } from '../conf/logger/logger.js';
import { client } from '../database/db.js';

/**
 * Retrieves elections for a given voter based on the given status.
 * @param {string} status - Status of the election to retrieve, can be 'active', 'finished' or 'future'
 * @param {string} voterId - ID of the voter
 * @param {boolean} [alreadyVoted=false] - Whether to retrieve elections which the voter has already voted in
 * @returns {Promise<Array>} - Array of elections
 */
export const getElections = async (status, voterId, alreadyVoted = false) => {
  const conditions = [];

  /* eslint-disable*/
  switch (status) {
    case 'active':
      conditions.push('start <= now() AND "end" >= now()');
      break;
    case 'finished':
      conditions.push('"end" < now()');
      break;
    case 'future':
      conditions.push('start > now()');
      break;
  }

  if (alreadyVoted) {
    conditions.push('vn.voted = true');
  } else {
    conditions.push('vn.voted = false');
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT 
      e.id,
      e.info,
      e.description,
      e.listvotes,
      e.votes_per_ballot,
      e.max_cumulative_votes,
      e.test_election_active,
      e.start,
      e.end
    FROM elections e
    INNER JOIN votingnotes vn ON vn.electionId = e.id AND vn.voterId = $1
    ${whereClause}
  `;

  try {
    logger.debug(`getElections sql: ${sql} with voterId: ${voterId} and status: ${status}`);
    const res = await client.query(sql, [voterId]);
    return res.rows || [];
  } catch (err) {
    logger.error('Error while retrieving elections');
    logger.debug(err.stack);
    throw new Error('Database query failed');
  }
};

/**
 * Retrieves an election by its id.
 *
 * @param {string} electionId - The id of the election.
 * @param {string} [faculty] - The faculty of the candidates to filter by.
 * @param {string} [votergroup] - The votergroup of the candidates to filter by.
 *
 * @returns {Promise<{ok: boolean, data: object | null}>}
 * A promise that resolves with an object containing ok and data properties.
 * ok is true if the election was found, false otherwise.
 * data is null if the election was not found, otherwise it is an object containing the election details.
 */
export const getElectionById = async (electionId) => {
  const sql = `
    SELECT 
      e.id,
      e.info,
      e.description,
      e.votes_per_ballot,
      e.max_cumulative_votes,
      e.start,
      e."end",
      COALESCE(json_agg(DISTINCT jsonb_build_object(
        'candidateId', c.id,
        'lastname', c.lastname,
        'firstname', c.firstname,
        'mtknr', c.mtknr,
        'faculty', c.faculty,
        'keyword', c.keyword,
        'listnum', ec.listnum
      )) FILTER (WHERE c.id IS NOT NULL AND c.approved), '[]') AS candidates
    FROM elections e
    LEFT JOIN electioncandidates ec ON e.id = ec.electionId
    LEFT JOIN candidates c ON ec.candidateId = c.id
    WHERE e.id = $1
    GROUP BY e.id
  `;

  try {
    const res = await client.query(sql, [electionId]);

    return res.rows[0] || undefined;
  } catch (err) {
    logger.error(`Error while retrieving election by id: ${electionId}`);
    logger.debug(err.stack);
    throw new Error('Database query failed');
  }
};

/**
 * Retrieves a voter by its ID from the voters table.
 * @param {number} voterId - The ID of the voter to retrieve.
 * @returns {Promise<{ok: boolean, data?: voter>>>} A promise resolving to an object with ok and data properties.
 * ok is true if the voter was found, false otherwise.
 * data is the voter object if found, or undefined if no voter was found.
 */
export const getVoterById = async (voterId) => {
  const sql = `
    SELECT *
    FROM voters
    WHERE uid = $1
  `;

  try {
    const res = await client.query(sql, [voterId]);
    logger.debug(`getVoterById res: ${JSON.stringify(res.rows)}`);
    return res.rows[0] || undefined;
  } catch (err) {
    logger.error(`Error while retrieving voter by id: ${voterId}`);
    logger.debug(err.stack);
    throw new Error('Database query failed');
  }
};

/**
 * Creates a ballot for a given voter and election.
 * @param {object} ballot - Object containing information about the ballot to be created.
 * @param {object} voter - Object containing information about the voter who is casting the ballot.
 * @returns {Promise<object>} A promise resolving to an object containing the created ballot.
 * The object contains the id property which is the ID of the created ballot.
 */
export const createBallot = async (ballot, voter) => {
  const sqlCreateBallot = `
    INSERT INTO ballots (election, valid)
    VALUES ($1, $2)
    RETURNING *
  `;

  const sqlCreateBallotVotes = `
    INSERT INTO ballotvotes (election, ballot, listnum, votes)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;

  const sqlCreateVotingNote = `
    UPDATE votingnotes SET voted = $1
    WHERE voterId = $2 AND electionId = $3
    RETURNING *
  `;

  try {
    await client.query('BEGIN');
    const resCreateBallot = await client.query(sqlCreateBallot, [ballot.electionId, ballot.valid]);
    if (resCreateBallot.rows.length === 0) {
      await client.query('ROLLBACK');

      return undefined;
    }
    //logger.debug(`createBallot res: ${JSON.stringify(resCreateBallot)}`);
    const ballotId = resCreateBallot.rows[0].id;
    if (!ballotId) {
      logger.error(`BallotId missing, not rechieved from creation`);
      await client.query('ROLLBACK');

      return undefined;
    }
    if (ballot.valid === false) {
      const resCreateVotingNote = await client.query(sqlCreateVotingNote, [
        true,
        voter.id,
        ballot.electionId,
      ]);
      logger.debug(`createVotingNote res: ${JSON.stringify(resCreateVotingNote)}`);
      if (resCreateVotingNote.rows.length === 0) {
        await client.query('ROLLBACK');
        return undefined;
      }

      await client.query('COMMIT');
      return resCreateBallot.rows[0];
    }
    for (const candidate of ballot.voteDecision) {
      const resCreateBallotV = await client.query(sqlCreateBallotVotes, [
        ballot.electionId,
        ballotId,
        candidate.listnum,
        candidate.votes,
      ]);
      logger.debug(`createBallot res: ${JSON.stringify(resCreateBallotV)}`);
      if (resCreateBallotV.rows.length === 0) {
        await client.query('ROLLBACK');

        return undefined;
      }
    }
    const resCreateVotingNote = await client.query(sqlCreateVotingNote, [
      voter.id,
      ballot.electionId,
      true,
    ]);
    logger.debug(`createVotingNote res: ${JSON.stringify(resCreateVotingNote)}`);
    if (resCreateVotingNote.rows.length === 0) {
      await client.query('ROLLBACK');
      return undefined;
    }

    await client.query('COMMIT');
    return resCreateBallot.rows[0];
  } catch (err) {
    logger.error(`Error occured`);
    logger.debug(err.stack);
    await client.query('ROLLBACK');
    throw new Error('Database query failed');
  }
};

/**
 * Checks if a voter has already voted for an election.
 * @param {string} voterId - The id of the voter.
 * @param {string} electionId - The id of the election.
 * @returns {Promise<boolean>} A promise resolving to true if the voter has already voted, false otherwise.
 */
export const checkAlreadyVoted = async (voterId, electionId) => {
  const sql = `
    SELECT *
    FROM votingnotes
    WHERE voterId = $1 AND electionId = $2
  `;

  try {
    logger.debug(
      `checkAlreadyVoted with sql: ${sql}, voterId: ${voterId}, electionId: ${electionId}`,
    );
    const res = await client.query(sql, [voterId, electionId]);
    logger.debug(`checkAlreadyVoted res: ${JSON.stringify(res.rows)}`);
    if (res.rows.length > 0 && res.rows[0].voted === true) {
      logger.debug('Voter has already voted');
      return true;
    }
    return false;
  } catch (err) {
    logger.error('Error while checking if voter has already voted');
    logger.debug(err.stack);
    return;
  }
};

/**
 * Checks if a candidate is valid for an election.
 * @param {number} listnumn - The list number of the candidate.
 * @param {string} eleId - The id of the election.
 * @returns {Promise<boolean>} A promise resolving to true if the candidate is valid, false otherwise.
 */
export const checkIfCandidateIsValid = async (listnumn, eleId) => {
  const sql = `
  SELECT candidateId
  FROM electioncandidates
  WHERE listnum = $1 AND electionId = $2
  `;

  try {
    logger.debug(`checkIfCandidateIsValid sql: ${sql} listnumn: ${listnumn} eleId: ${eleId}`);
    const res = await client.query(sql, [listnumn, eleId]);
    logger.debug(`checkIfCandidateIsValid res: ${JSON.stringify(res.rows)}`);
    if (res.rows.length === 0) {
      return false;
    }
    logger.debug('Candidate is valid');
    return true;
  } catch (err) {
    logger.error('Error while checking if candidate is valid');
    logger.debug(err.stack);
    return false;
  }
};

/**
 * Checks if the number of votes is valid for a given ballot schema.
 * Validates that the total votes do not exceed the votes per ballot limit and that the maximum votes per candidate do not exceed the max cumulative votes limit.
 * @param {object} ballotSchema - Ballot schema to be validated.
 * @param {number} maxCumulativeVotes - Maximum cumulative votes allowed per candidate.
 * @param {number} votesperballot - Maximum votes allowed per ballot.
 * @returns {boolean} True if the number of votes is valid, false otherwise.
 */
export const checkIfNumberOfVotesIsValid = (ballotSchema, maxCumulativeVotes, votesperballot) => {
  let totalVotes = 0;
  let maxVotesPerCandidate = 0;

  for (const candidate of ballotSchema.voteDecision) {
    totalVotes += candidate.votes;
    if (candidate.votes > maxVotesPerCandidate) {
      maxVotesPerCandidate = candidate.votes;
    }
  }
  if (totalVotes > votesperballot) {
    logger.warn(`Total votes ${totalVotes} exceed votes per ballot limit of ${votesperballot}`);
    return false;
  }
  if (maxVotesPerCandidate > maxCumulativeVotes) {
    logger.warn(
      `Max votes per candidate ${maxVotesPerCandidate} exceed max cumulative votes limit of ${maxCumulativeVotes}`,
    );
    return false;
  }
  return true;
};
