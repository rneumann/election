import { logger } from '../conf/logger/logger.js';
import { client } from '../database/db.js';

/**

/**
 * Retrieves all elections from the electionoverview table.
 * @returns {Promise<Array<electionoverview>>} A promise resolving to an array of electionoverview objects.
 */
export const getElections = async () => {
  const sql = `
    SELECT *
    FROM electionoverview
  `;
  const queryRes = await client
    .query(sql)
    .then((res) => {
      if (res.rows.length === 0) {
        return {
          ok: false,
          data: [],
        };
      }
      return {
        ok: true,
        data: res.rows,
      };
    })
    .catch((err) => {
      logger.error(err.stack);
      return {
        ok: false,
        data: undefined,
      };
    });

  return queryRes;
};

/**
 * Retrieves an election by its ID from the elections table.
 * The election is joined with its candidates and voting notes using a left join.
 * @param {number} id - The ID of the election to retrieve.
 * @returns {Promise<{ok: boolean, data?: Array<election>>>} A promise resolving to an object with ok and data properties.
 * ok is true if the election was found, false otherwise.
 * data is an array containing the election object, or an empty array if no election was found.
 */
export const getElectionById = async (id) => {
  const sql = `
    SELECT 
      e.id,
      e.info,
      e.description,
      e.votes_per_ballot,
      e.start,
      e."end",
      COALESCE(json_agg(DISTINCT jsonb_build_object(
        'candidateId', c.id,
        'lastname', c.lastname,
        'firstname', c.firstname,
        'mtknr', c.mtknr,
        'faculty', c.faculty,
        'listnum', ec.listnum
      )) FILTER (WHERE c.id IS NOT NULL AND c.approved), '[]') AS candidates
    FROM elections e
    LEFT JOIN electioncandidates ec ON e.id = ec.electionId
    LEFT JOIN candidates c ON ec.candidateId = c.id
    WHERE e.id = $1
    GROUP BY e.id
  `;

  try {
    const res = await client.query(sql, [id]);

    if (res.rows.length === 0) {
      return { ok: false, data: null };
    }

    return { ok: true, data: res.rows[0] };
  } catch (err) {
    logger.error(err.stack);
    return { ok: false, data: undefined };
  }
};
