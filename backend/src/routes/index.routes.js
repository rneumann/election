import crypto from 'crypto';
import express from 'express';
import { ensureAuthenticated, ensureHasRole, loginRoute, logoutRoute } from '../auth/auth.js';
import passport from '../auth/passport.js';
import { logger } from '../conf/logger/logger.js';
import { countingRouter } from './counting.route.js';
import { exportRoute } from './export.route.js';
import { voterRouter } from './voter.routes.js';
import { candidateRouter } from './candidate.route.js';
import { importRouter } from './upload.route.js';
import { auditRouter } from './audit.routes.js';
import { adminRouter } from './admin.routes.js';

const { AUTH_PROVIDER } = process.env;

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
 *                 example: admin
 *               password:
 *                 type: string
 *                 example: p
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
AUTH_PROVIDER === 'ldap' && router.post('/auth/login/ldap', loginRoute('ldap'));

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
AUTH_PROVIDER === 'keycloak' && router.get('/auth/login/kc', passport.authenticate('oidc_kc'));

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
AUTH_PROVIDER === 'keycloak' &&
  router.get(
    '/auth/callback/kc',
    passport.authenticate('oidc_kc', {
      failureRedirect: 'http://localhost:5173/login',
    }),
    (req, res) => {
      req.session.sessionSecret = crypto.randomBytes(32).toString('hex');
      req.session.freshUser = true;
      req.session.lastActivity = Date.now();
      req.session.csrfToken = crypto.randomBytes(32).toString('hex');
      logger.debug(
        `Keycloak set freshUser to true and CSRF token generated: ${req.session.csrfToken}`,
      );
      res.redirect('http://localhost:5173/home');
    },
  );

router.get('/auth/csrf-token', ensureAuthenticated, (req, res) => {
  logger.debug('CSRF token requested');
  if (!req.session.csrfToken) {
    logger.debug('No CSRF token found, throwing error');
    return res.status(500).json({ error: 'CSRF token not found' });
  }
  res.json({ csrfToken: req.session.csrfToken });
});

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
  if (req.isAuthenticated()) {
    res.json({ authenticated: true, user: req.user });
  } else {
    res.status(401).json({ authenticated: false });
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
 * /api/config/auth-provider:
 *   get:
 *     summary: Get authentication provider configuration
 *     description: Returns the configured authentication provider (ldap, keycloak, saml)
 *     tags:
 *       - Configuration
 *     responses:
 *       200:
 *         description: Auth provider configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authProvider:
 *                   type: string
 *                   enum: [ldap, keycloak, saml]
 *                   example: ldap
 */
router.get('/config/auth-provider', (req, res) => {
  logger.debug('Returning auth provider');
  logger.debug(`Following auth provider: ${AUTH_PROVIDER}`);
  res.status(200).json({ authProvider: AUTH_PROVIDER });
});

/**
 * Voter routes - Voter management and voting operations
 *
 * Endpoints:
 * - GET /api/voter/elections - Get elections for authenticated voter
 * - POST /api/voter/ballot - Submit a ballot
 * - GET /api/voter/ballot/:electionId - Check if voter has already voted
 *
 * All routes require voter authentication.
 */
router.use('/voter', voterRouter);

/**
 * Candidate routes - Candidate information management
 *
 * Endpoints:
 * - GET /api/candidates/:electionId - Get candidates for an election
 * - POST /api/candidates/:electionId - Upload candidate info (admin/committee)
 * - PUT /api/candidates/:electionId/:candidateId - Update candidate info
 * - DELETE /api/candidates/:electionId/:candidateId - Delete candidate info
 *
 * Read operations require voter auth, write operations require admin/committee role.
 */
router.use('/candidates', candidateRouter);

/**
 * Upload/Import routes - Election data import
 *
 * Endpoints:
 * - POST /api/upload/voters - Import voter list from Excel
 * - POST /api/upload/elections - Import election definitions from Excel
 *
 * All routes require authentication and admin role.
 */
router.use('/upload', importRouter);

/**
 * Audit routes - Audit log access
 *
 * Endpoints:
 * - GET /api/audit/logs - Retrieve audit logs with filtering
 *
 * All routes require authentication and admin role.
 */
router.use('/audit', auditRouter);

/**
 * Admin routes - Administrative operations
 *
 * Endpoints:
 * - GET /api/admin/elections - Get all elections with metadata (admin view)
 * - PUT /api/admin/controlTestElection/:electionId - Toggle test election status
 * - DELETE /api/admin/reset - Reset all election data (DESTRUCTIVE)
 *
 * All routes require authentication and admin/committee role.
 */
router.use('/admin', adminRouter);

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

/**
 * Export routes - Election result exports
 *
 * Endpoints:
 * - GET /api/export/election-result/:resultId - Export result as Excel
 *
 * All routes require authentication and admin/committee role.
 */
router.use('/export', ensureAuthenticated, ensureHasRole(['admin', 'committee']), exportRoute);

