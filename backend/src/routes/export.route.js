import { ensureAuthenticated, ensureHasRole } from '../auth/auth.js';
import {
  exportTotalResultsRoute,
  exportBallotsRoute,
  exportElectionDefinitionRoute,
} from '../service/export.service.js';
import express from 'express';
export const exportRoute = express.Router();
/**
 * @openapi
 * /api/export/results/{electionId}:
 *   get:
 *     summary: Download anonymized ballot data
 *     tags:
 *       - Elections
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: electionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The election ID whose anonymized ballots should be exported.
 *     responses:
 *       200:
 *         description: Excel file containing anonymized ballot → candidate assignments.
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — user lacks required role
 *       404:
 *         description: No ballots found for this election ID
 *       500:
 *         description: Internal server error
 */

exportRoute.get(
  '/results/:electionId',
  ensureAuthenticated,
  ensureHasRole('admin'),
  exportBallotsRoute,
);

/**
 * @openapi
 * /api/export/totalresults/{electionId}:
 *   get:
 *     summary: Download aggregated election results (Admin/Committee only)
 *     description: Exports a complete Excel file containing all candidate vote totals for a specific election.
 *     tags:
 *       - Elections
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: electionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the election.
 *     responses:
 *       200:
 *         description: Excel file with aggregated election results.
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — user lacks required role
 *       404:
 *         description: No results found for this election ID
 *       500:
 *         description: Internal server error
 */
exportRoute.get(
  '/totalresults/:electionId',
  ensureAuthenticated,
  ensureHasRole('admin'),
  exportTotalResultsRoute,
);

/**
 * @openapi
 * /api/export/definition/{electionId}:
 *   get:
 *     summary: Download election definition
 *     description: Exports the metadata, configuration and voter group assignments for an election as an Excel file.
 *     tags:
 *       - Elections
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: electionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The election ID whose definition should be exported.
 *     responses:
 *       200:
 *         description: Excel file containing election definition and metadata.
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Election not found
 *       500:
 *         description: Internal server error
 */
exportRoute.get(
  '/definition/:electionId',
  ensureAuthenticated,
  ensureHasRole(['admin']),
  exportElectionDefinitionRoute,
);
