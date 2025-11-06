import dotenv from 'dotenv';
import { Client } from 'pg';
import { logger } from '../conf/logger/logger.js';

dotenv.config();

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export async function connectDb() {
  try {
    await client.connect();
    logger.info('Connected to the database successfully');

    const { rows } = await client.query('SELECT NOW() AS now');
    logger.info('Database time:', rows[0].now);
  } catch (err) {
    logger.info('Database connection error:', err.stack);
    process.exit(1);
  }
}

export { client };
