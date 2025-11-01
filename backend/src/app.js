import express from 'express';
import helmet from 'helmet';
import { router } from './routes/index.routes.js';
export const app = express();

/**
 * Setup Express middlewares and routes
 */

/**
 * Helmet for setting various HTTP headers for app security
 */
app.use(helmet());

/**
 * Body parsers
 */
app.use(express.json());

/**
 * URL-encoded body parser
 */
app.use(express.urlencoded({ extended: true }));

/**
 * Health check route
 */
app.get('/health', (req, res) => res.json({ status: 'ok' }));

/**
 * Binding API routes
 */
app.use('/api', router);
