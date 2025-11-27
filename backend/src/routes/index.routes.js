import crypto from 'crypto';
import express from 'express';
import { ensureAuthenticated, ensureHasRole, loginRoute, logoutRoute } from '../auth/auth.js';
import passport from '../auth/passport.js';
import { logger } from '../conf/logger/logger.js';
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
