import crypto from 'crypto';
import express from 'express';
import { ensureAuthenticated, ensureHasRole, loginRoute, logoutRoute } from '../auth/auth.js';
import passport from '../auth/passport.js';
import { logger } from '../conf/logger/logger.js';
import { importWahlerRoute, importElectionRoute } from './upload.route.js';
import {
  exportTotalResultsRoute,
  exportBallotsRoute,
  exportElectionDefinitionRoute,
} from './download.route.js';
import { countingRouter } from './counting.route.js';
export const router = express.Router();

/**
 * API routes
 */

/**
 * @openapi
 * /api/auth/login/ldap:
 *   post:
 *     summary: LDAP Login
 *     description: Authenticates a user via LDAP
 *     tags:
 *      - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: jdoe
 *               password:
 *                 type: string
 *                 example: secret123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authenticated:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       405:
 *         description: Method Not Allowed
 *       415:
 *         description: Unsupported MIME type
 *       500:
 *         description: Internal Server Error
 */
router.post('/auth/login/ldap', loginRoute('ldap'));

// SAML Login
//router.get('/auth/login/saml', passport.authenticate('saml'));

// SAML Callback
// router.post(
//   '/auth/saml/callback',
//   passport.authenticate('saml', {
//     failureRedirect: 'http://localhost:5173/login',
//   }),
//   (req, res) => {
//     req.session.sessionSecret = crypto.randomBytes(32).toString('hex');
//     req.session.freshUser = true;
//     req.session.lastActivity = Date.now();
//     logger.debug('SAML set freshUser to true');
//     res.redirect('http://localhost:5173/home');
//   },
// );

// Keycloak Login
/**
 * @openapi
 * /api/auth/login/kc:
 *   get:
 *     summary: Start Keycloak login flow
 *     description: Redirects the user to Keycloak for authentication.
 *     tags:
 *       - Authentication
 *     responses:
 *       302:
 *         description: Redirect to Keycloak login page
 */
router.get('/auth/login/kc', passport.authenticate('oidc_kc'));

// Keycloak Callback
/**
 * @openapi
 * /api/auth/callback/kc:
 *   get:
 *     summary: Keycloak callback
 *     description: Called by Keycloak after login.
 *     tags:
 *       - Authentication
 *     responses:
 *       302:
 *         description: Redirect to the frontend after successful login
 *       401:
 *         description: Authentication failed
 */
router.get(
  '/auth/callback/kc',
  passport.authenticate('oidc_kc', {
    failureRedirect: 'http://localhost:5173/login',
  }),
  (req, res) => {
    req.session.sessionSecret = crypto.randomBytes(32).toString('hex');
    req.session.freshUser = true;
    req.session.lastActivity = Date.now();
    logger.debug('Keycloak set freshUser to true');
    res.redirect('http://localhost:5173/home');
  },
);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: Authentication status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authenticated:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   example:
 *                     username: jdoe
 *                     authProvider: ldap
 *                     role: voter
 *                   nullable: true
 */
router.get('/auth/me', (req, res) => {
  logger.debug('Me route accessed');
  logger.debug(`Identity provider: ${JSON.stringify(req.user?.authProvider)}`);
  if (req.isAuthenticated()) {
    res.json({ authenticated: true, user: req.user });
  } else {
    res.json({ authenticated: false });
  }
});

/**
 * @openapi
 * /api/auth/logout:
 *   delete:
 *     summary: Logout user
 *     description: Destroys the user session and clears cookies.
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: User logged out
 *       500:
 *         description: Logout failed
 */
router.delete('/auth/logout', logoutRoute);

/**
 * @openapi
 * /api/upload/voters:
 *   post:
 *     summary: Upload voter list
 *     description: Uploads a CSV or Excel file with voter data.
 *     security:
 *       - cookieAuth: []
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
router.post('/upload/voters', ensureAuthenticated, ensureHasRole(['admin']), importWahlerRoute);

/**
 * @swagger
 * /api/download/results/{electionId}:
 *   get:
 *     summary: Downloads the election.
 *     tags: [Download]
 *     parameters:
 *       - in: path
 *         name: electionId
 *         schema:
 *           type: string
 *         required: true
 *         description: Id of the election whose results should be downloaded.
 *     responses:
 *       200:
 *         description: Results as a json-file.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 electionId:
 *                   type: string
 *                 totalVotes:
 *                   type: integer
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       candidate:
 *                         type: string
 *                       votes:
 *                         type: integer
 *       401:
 *         description: Unauthorized (not logged in)
 *       403:
 *         description: Forbidden (user does not have the required role)
 *       404:
 *         description: Election or results not found.
 *       500:
 *         description: Internal server error.
 */

router.get(
  '/download/results/:electionId',
  ensureAuthenticated,
  ensureHasRole('admin'),
  exportBallotsRoute,
);

/**
 * @openapi
 * /api/download/totalresults/{electionId}:
 *   get:
 *     summary: Download aggregated election results (Admin/Committee only)
 *     description: Fetches the total aggregated vote counts for each candidate in a specific election.
 *     tags: [Download]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: electionId
 *         schema:
 *           type: string
 *         required: true
 *         description: The unique ID of the election.
 *     responses:
 *       200:
 *         description: A JSON file containing the aggregated election results.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 electionId:
 *                   type: string
 *                 totalVotes:
 *                   type: integer
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       candidate:
 *                         type: string
 *                       votes:
 *                         type: integer
 *       401:
 *         description: Unauthorized (not logged in)
 *       403:
 *         description: Forbidden (user does not have the required role)
 *       404:
 *         description: Not Found (electionId does not exist or has no results)
 *       500:
 *         description: Internal server error
 */
router.get(
  '/download/totalresults/:electionId',
  ensureAuthenticated,
  ensureHasRole('admin'),
  exportTotalResultsRoute,
);

/**
 * @openapi
 * /api/upload/elections:
 *   post:
 *     summary: Upload election definitions
 *     description: Uploads a CSV or Excel file with election definitions (Wahlen.csv).
 *     tags:
 *       - Upload
 *     security:
 *       - cookieAuth: []
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

router.post(
  '/upload/elections',
  ensureAuthenticated,
  ensureHasRole(['admin']),
  importElectionRoute,
);

/**
 * @openapi
 * /api/download/definition/{electionId}:
 *   get:
 *     summary: Download election definition
 *     description: Exports the metadata and voter groups for a specific election.
 *     tags:
 *       - Download
 *     parameters:
 *       - in: path
 *         name: electionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: JSON file containing election details
 *       404:
 *         description: Election not found
 */

router.get(
  '/download/definition/:electionId',
  ensureAuthenticated,
  ensureHasRole(['admin']),
  exportElectionDefinitionRoute,
);

/**
 * Testing routes for protection
 * @openapi
 * /api/protected:
 *   get:
 *     summary: Protected route
 *     responses:
 *       200:
 *         description: Protected route accessed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/protected', ensureAuthenticated, (req, res) => {
  res.json({ message: `Protected route accessed with user: ${req.user.username}` });
});
router.get('/protected/role', ensureHasRole(['admin']), (req, res) => {
  res.json({ message: `Protected route accessed with user: ${req.user.username}` });
});

/**
 * Counting routes - Vote counting and results management
 *
 * Endpoints:
 * - POST /api/counting/:electionId/count - Perform vote counting
 * - GET /api/counting/:electionId/results - Retrieve counting results
 * - POST /api/counting/:electionId/finalize - Finalize results (lock)
 *
 * All routes require authentication and admin/committee role.
 */
router.use('/counting', countingRouter);
