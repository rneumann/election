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

auditRouter.get('/logs', ensureAuthenticated, ensureHasRole(['admin']), async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 1000000;
    const result = await client.query('SELECT * FROM audit_log ORDER BY id DESC LIMIT $1', [limit]);
    res.json(result.rows);
  } catch (err) {
    logger.error('Error fetching audit logs:', err);
    res.status(500).json({ error: 'Serverfehler beim Abrufen der Logs' });
  }
});
