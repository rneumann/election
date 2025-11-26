import { logger } from '../conf/logger/logger.js';
import { client } from '../database/db.js';

/**
 * Retrieves all elections from the electionoverview table.
 *
 * @param {string} [status] The status of the election to be retrieved. If not provided, all elections will be returned.
 * @param faculty
 * @param votergroup
 * @returns {Promise<{ ok: boolean, data: Array<object> || undefined >}} A promise resolving to an object with an ok property and a data property containing an array of elections.
 */
export const getElections = async (status, faculty, votergroup) => {
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
  /* eslint-enable*/

  if (faculty) {
    conditions.push(`vg.faculty = $1`);
  }

  if (votergroup) {
    conditions.push(`vg.votergroup = $2`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT *
    FROM electionoverview
    LEFT JOIN votergroups vg ON vg.electionId = electionoverview.id
    ${whereClause}
  `;

  const params = [];
  if (faculty) {
    params.push(faculty);
  }
  if (votergroup) {
    params.push(votergroup);
  }

  try {
    logger.debug(`getElections sql: ${sql} params: ${JSON.stringify(params)}`);
    const res = await client.query(sql, params);
    return { ok: true, data: res.rows };
  } catch (err) {
    logger.error(err);
    return { ok: false, data: undefined };
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

    if (res.rows.length === 0) {
      return { ok: false, data: null };
    }

    return { ok: true, data: res.rows[0] };
  } catch (err) {
    logger.error(err.stack);
    return { ok: false, data: undefined };
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
    if (res.rows.length === 0) {
      return { ok: false, data: undefined };
    }

    return { ok: true, data: res.rows[0] };
  } catch (err) {
    logger.error(err.stack);
    return { ok: false, data: undefined };
  }
};

/**
 * Creates a new ballot for a given election and voter.
 * @param {object} ballot - Ballot data to be inserted into the database.
 * @param {number} voterUid - The ID of the voter creating the ballot.
 * @returns {Promise<{ok: boolean, data?: object>>>} A promise resolving to an object with ok and data properties.
 * ok is true if the ballot was created successfully, false otherwise.
 * data is the inserted ballot data if ok is true, or undefined if no ballot was created.
 */
export const createBallot = async (ballot, voterUid) => {
  const voter = await getVoterById(voterUid);
  if (!voter.ok) {
    return { ok: false, data: undefined, status: 404, message: 'Voter not found' };
  }

  const alreadyVoted = await checkAlreadyVoted(voter.data.id, ballot.electionId);
  if (alreadyVoted) {
    return { ok: false, data: undefined, status: 409, message: 'Voter already voted' };
  }

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
    INSERT INTO votingnotes (voterId, electionId, voted)
    VALUES ($1, $2, $3)
    RETURNING *
  `;

  try {
    await client.query('BEGIN');
    const resCreateBallot = await client.query(sqlCreateBallot, [ballot.electionId, ballot.valid]);
    if (resCreateBallot.rows.length === 0) {
      await client.query('ROLLBACK');

      return { ok: false, data: undefined };
    }
    //logger.debug(`createBallot res: ${JSON.stringify(resCreateBallot)}`);
    const ballotId = resCreateBallot.rows[0].id;
    if (!ballotId) {
      logger.error(`BallotId missing, not rechieved from creation`);
      await client.query('ROLLBACK');

      return { ok: false, data: undefined };
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

        return { ok: false, data: undefined };
      }
    }
    const resCreateVotingN = await client.query(sqlCreateVotingNote, [
      voter.data.id,
      ballot.electionId,
      true,
    ]);
    logger.debug(`createVotingNote res: ${JSON.stringify(resCreateVotingN)}`);
    if (resCreateVotingN.rows.length === 0) {
      await client.query('ROLLBACK');
      return { ok: false, data: undefined };
    }

    await client.query('COMMIT');
    return { ok: true, data: resCreateBallot.rows[0] };
  } catch (err) {
    logger.error(`Error occured`);
    logger.debug(err.stack);
    await client.query('ROLLBACK');
    return { ok: false, data: undefined };
  }
};

/**
 * Checks if a voter has already voted for an election.
 * @param {string} voterId - The id of the voter.
 * @param {string} electionId - The id of the election.
 * @returns {Promise<boolean>} A promise resolving to true if the voter has already voted, false otherwise.
 */
const checkAlreadyVoted = async (voterId, electionId) => {
  const sql = `
    SELECT *
    FROM votingnotes
    WHERE voterId = $1 AND electionId = $2
  `;

  try {
    const res = await client.query(sql, [voterId, electionId]);
    logger.debug(`checkAlreadyVoted res: ${JSON.stringify(res.rows)}`);
    if (res.rows.length === 0) {
      return false;
    }
    return true;
  } catch (err) {
    logger.error('Error while checking if voter has already voted');
    logger.debug(err.stack);
    return false;
  }
};
