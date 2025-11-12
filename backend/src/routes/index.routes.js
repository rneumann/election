import express from 'express';
import { ensureAuthenticated, ensureHasRole } from '../auth/auth.js';
import passport from '../auth/passport.js';
import { logger } from '../conf/logger/logger.js';
import { loginRoute, logoutRoute } from './auth.route.js';
export const router = express.Router();

/**
 * API routes
 */

/**
 * @openapi
 * /api/auth/login:
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
// SAML-Login → GET für Redirect zum IdP
router.get('/auth/login/saml', passport.authenticate('saml'));

// SAML Callback → POST vom IdP, Passport-SAML verarbeitet es direkt
router.post(
  '/auth/saml/callback',
  passport.authenticate('saml', {
    failureRedirect: 'http://localhost:5173/login',
    successRedirect: 'http://localhost:5173/home',
  }),
);

router.get('/auth/me', (req, res) => {
  logger.debug('Me route accessed');
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
 * Testing routes for protection
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
