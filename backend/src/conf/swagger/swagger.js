import path from 'path';
import { fileURLToPath } from 'url';
import swaggerJsdoc from 'swagger-jsdoc';
import { logger } from '../logger/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const swaggerOptionsb = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Election API',
      version: '1.0.0',
      description: 'API Dokumentation für die Wahlverwaltung + Login & Logout',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Lokaler Server',
      },
    ],
  },
  apis: [path.join(__dirname, '../../routes/*.js')],
};
logger.info('Swagger initialized');
export const swaggerSpec = swaggerJsdoc(swaggerOptionsb);
