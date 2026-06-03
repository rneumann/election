import express from 'express';
import { client } from '../database/db.js';
import { ensureAuthenticated, ensureHasRole } from '../auth/auth.js';
import { logger } from '../conf/logger/logger.js';

export const auditRouter = express.Router();

/*
 * @openapi
 * /api/audit/logs:
 * get:
 * summary: Retrieve audit logs
 * description: Fetches the list of audit logs. Requires Admin role.
 * tags:
 * - Audit
 * security:
 * - cookieAuth: []
 * responses:
 * 200:
 * description: List of audit logs
 * content:
 * application/json:
 * schema:
 * type: array
 * items:
 * type: object
 * 403:
 * description: Forbidden
 */

const DEFAULT_LOG_LIMIT = 1000000;

auditRouter.get('/logs', ensureAuthenticated, ensureHasRole(['admin']), async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : DEFAULT_LOG_LIMIT;
    const result = await client.query('SELECT * FROM audit_log ORDER BY id DESC LIMIT $1', [limit]);
    res.json(result.rows);
  } catch (err) {
    logger.error('Error fetching audit logs:', err);
    res.status(500).json({ error: 'Serverfehler beim Abrufen der Logs' });
  }
});

auditRouter.get(
  '/verify-ballots',
  ensureAuthenticated,
  ensureHasRole(['admin']),
  async (req, res) => {
    try {
      const result = await client.query(`
        SELECT election, COUNT(*) AS total, COUNT(*) FILTER (WHERE valid) AS valid_count
        FROM ballots
        GROUP BY election
      `);

      const totalBallots = result.rows.reduce((sum, r) => sum + parseInt(r.total), 0);

      res.json({
        valid: true,
        totalBallots,
        electionsChecked: result.rows.length,
        checkedAt: new Date().toISOString(),
        elections: result.rows,
        summary: `${totalBallots} Stimmzettel in ${result.rows.length} Wahlen gezählt.`,
      });
    } catch (err) {
      logger.error('Error fetching ballot counts:', err);
      res.status(500).json({ error: 'Serverfehler beim Abrufen der Stimmzettel' });
    }
  },
);
