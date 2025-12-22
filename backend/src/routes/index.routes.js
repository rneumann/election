import crypto from 'crypto';
import express from 'express';
import { ensureAuthenticated, ensureHasRole, loginRoute, logoutRoute } from '../auth/auth.js';
import passport from '../auth/passport.js';
import { logger } from '../conf/logger/logger.js';
import { countingRouter } from './counting.route.js';
import { exportRoute } from './export.route.js';

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
