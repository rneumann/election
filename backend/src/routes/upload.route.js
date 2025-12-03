import { Router } from 'express';
import {
  importWahlerRoute,
  importElectionRoute,
  importCandidateRoute,
} from '../service/upload.service.js';
import { ensureAuthenticated, ensureHasRole } from '../auth/auth.js';
import { writeAuditLog } from '../audit/auditLogger.js';

export const importRouter = Router();
/**
 * @openapi
 * /api/upload/voters:
 *   post:
 *     summary: Upload voter list
 *     description: Uploads a CSV or Excel file with voter data.
 *     tags:
 *       - Elections
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: header
 *         name: X-CSRF-Token
 *         required: true
 *         description: CSRF token for security.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *       400:
 *         description: Bad request (no file, invalid file type/size)
 *       401:
 *         description: Unauthorized (not logged in)
 *       403:
 *         description: Forbidden (not an admin)
 */
importRouter.post('/voters', ensureAuthenticated, ensureHasRole(['admin']), importWahlerRoute);

/**
 * @openapi
 * /api/upload/elections:
 *   post:
 *     summary: Upload election definitions
 *     description: Uploads a CSV or Excel file with election definitions (Wahlen.csv).
 *     tags:
 *       - Elections
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: header
 *         name: X-CSRF-Token
 *         required: true
 *         description: CSRF token for security.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Elections imported successfully
 *       400:
 *         description: Bad request (no file, invalid format)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (requires admin role)
 *       500:
 *         description: Import failed
 */

importRouter.post('/elections', ensureAuthenticated, ensureHasRole(['admin']), importElectionRoute);

/**
 * @openapi
 * /api/upload/candidates:
 *   post:
 *     summary: Upload candidate directory (Excel/CSV)
 *     tags:
 *       - Elections
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: header
 *         name: X-CSRF-Token
 *         required: true
 *         description: CSRF token for security.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *       400:
 *         description: File missing or invalid
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

importRouter.post('/candidates', ensureAuthenticated, ensureHasRole('admin'), importCandidateRoute);
