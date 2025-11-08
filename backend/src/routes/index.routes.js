import express from 'express';
import { ensureAuthenticated } from '../auth/auth.js';
import { loginRoute } from './auth.route.js';
export const router = express.Router();

router.post('/auth/login', loginRoute);
router.get('/protectet', ensureAuthenticated, (req, res) => {
  // @ts-ignore
  res.json({ message: `Protected route accessed with user: ${req.user.username}` });
});
