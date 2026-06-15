import express from 'express';

export const healthRouter = express.Router();
/**
 * Health check route
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     responses:
 *       200:
 *         description: OK
 */
healthRouter.get('/health', (req, res) => res.json({ status: 'ok' }));
