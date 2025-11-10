import express from 'express';
import { ensureAuthenticated, ensureHasRole } from '../auth/auth.js';
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
router.post('/auth/login', loginRoute);

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
