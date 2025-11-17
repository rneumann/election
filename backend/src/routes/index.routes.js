import express from 'express';
import { ensureAuthenticated, ensureHasRole } from '../auth/auth.js';
import passport from '../auth/passport.js';
import { logger } from '../conf/logger/logger.js';
import { loginRoute, logoutRoute } from './auth.route.js';
import { importWahlerRoute } from './upload.route.js';
import { exportResultsRoute } from './download.route.js';
export const router = express.Router();

/**
 * API routes
 */

/**
 * @openapi
 * /api/auth/login/ldap:
 *   post:
 *     summary: Login a user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User logged in successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/auth/login/ldap', loginRoute('ldap'));

// SAML Login
router.get('/auth/login/saml', passport.authenticate('saml'));

// SAML Callback
router.post(
  '/auth/saml/callback',
  passport.authenticate('saml', {
    failureRedirect: 'http://localhost:5173/login?error=saml_failed',
    successRedirect: 'http://localhost:5173/auth/callback?provider=saml',
  }),
);

// Keycloak Login
router.get('/auth/login/kc', passport.authenticate('oidc_kc'));

// Keycloak Callback
router.get(
  '/auth/callback/kc',
  passport.authenticate('oidc_kc', {
    failureRedirect: 'http://localhost:5173/login?error=keycloak_failed',
    successRedirect: 'http://localhost:5173/auth/callback?provider=keycloak',
  }),
);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get current user
 *     responses:
 *       200:
 *         description: Current user information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authenticated:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                   properties:
 *                     username:
 *                       type: string
 *                     role:
 *                       type: string
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
 *     summary: Logout a user
 *     responses:
 *       200:
 *         description: User logged out successfully
 *       500:
 *         description: Internal Server Error
 */
router.delete('/auth/logout', logoutRoute);

/**
 * @openapi
 * /api/upload/voters:
 * post:
 * summary: Upload voter list (Admin only)
 * description: Uploads a CSV or Excel file with voter data.
 * security:
 * - cookieAuth: []
 * requestBody:
 * required: true
 * content:
 * multipart/form-data:
 * schema:
 * type: object
 * properties:
 * file:
 * type: string
 * format: binary
 * responses:
 * 200:
 * description: File uploaded successfully
 * 400:
 * description: Bad request (no file, invalid file type/size)
 * 401:
 * description: Unauthorized (not logged in)
 * 403:
 * description: Forbidden (not an admin)
 */
router.post('/upload/voters', ensureAuthenticated, ensureHasRole(['admin']), importWahlerRoute);

/**
 * @swagger
 * /download/results/{electionId}:
 * get:
 * summary: Downloads the election.
 * tags: [Download]
 * parameters:
 * - in: path
 * name: electionId
 * schema:
 * type: string
 * required: true
 * description: Id of the election, which results should be downloaded.
 * responses:
 * 200:
 * description: Results as a json-file.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * electionId:
 * type: string
 * totalVotes:
 * type: integer
 * results:
 * type: array
 * items:
 * type: object
 * properties:
 * candidate:
 * type: string
 * votes:
 * type: integer
 * 401:
 * description: Unauthorized (not logged in)
 * 403:
 * description: Forbidden (user does not have the required role)
 * 404:
 * description: Election or results not found.
 * 500:
 * description: Intern server-error.
 */
router.get(
  '/download/results/:electionId',
  ensureAuthenticated,
  ensureHasRole('admin'),
  exportResultsRoute,
);

/**
 * @openapi
 * /api/download/totalresults/{electionId}:
 * get:
 * summary: Download aggregated election results (Admin/Comittee only)
 * description: Fetches the total aggregated vote counts for each candidate in a specific election.
 * tags: [Download]
 * security:
 * - cookieAuth: []
 * parameters:
 * - in: path
 * name: electionId
 * schema:
 * type: string
 * required: true
 * description: The unique ID of the election.
 * responses:
 * 200:
 * description: A JSON file containing the aggregated election results.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * electionId:
 * type: string
 * totalVotes:
 * type: integer
 * results:
 * type: array
 * items:
 * type: object
 * properties:
 * candidate:
 * type: string
 * votes:
 * type: integer
 * 401:
 * description: Unauthorized (not logged in)
 * 403:
 * description: Forbidden (user does not have the required role)
 * 404:
 * description: Not Found (electionId does not exist or has no results)
 * 500:
 * description: Internal server error
 */
router.get(
  '/download/totalresults/:electionId',
  ensureAuthenticated,
  ensureHasRole('admin'),
  exportTotalResultsRoute,
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
  // @ts-ignore
  res.json({ message: `Protected route accessed with user: ${req.user.username}` });
});
// @ts-ignore
router.get('/protected/role', ensureHasRole(['admin']), (req, res) => {
  // @ts-ignore
  res.json({ message: `Protected route accessed with user: ${req.user.username}` });
});
