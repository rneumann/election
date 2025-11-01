import express from 'express';
import { loginRoute } from './auth.route.js';
export const router = express.Router();

router.post('/auth/login', loginRoute);
