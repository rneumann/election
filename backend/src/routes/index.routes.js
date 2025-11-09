import express from 'express';
import { ensureAuthenticated, ensureHasRole } from '../auth/auth.js';
import { loginRoute, logoutRoute } from './auth.route.js';
export const router = express.Router();

/**
 * API routes
 */

/**
 * Route to login a user
 */
router.post('/auth/login', loginRoute);

/**
 * Route to logout a user
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
