import express from 'express';
import { ensureAuthenticated, ensureHasRole } from '../auth/auth.js';
import { loginRoute } from './auth.route.js';
export const router = express.Router();

router.post('/auth/login', loginRoute);
router.get('/protected', ensureAuthenticated, (req, res) => {
  // @ts-ignore
  res.json({ message: `Protected route accessed with user: ${req.user.username}` });
});
// @ts-ignore
router.get('/protected/role', ensureHasRole(['admin']), (req, res) => {
  // @ts-ignore
  res.json({ message: `Protected route accessed with user: ${req.user.username}` });
});
