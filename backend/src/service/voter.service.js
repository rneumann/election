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
