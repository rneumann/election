import { createClient } from 'redis';
import { logger } from '../logger/logger.js';

const redisConf = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
};

const redisUrl = `redis://:${encodeURIComponent(redisConf.password)}@${redisConf.host}:${redisConf.port}`;
export const redisClient = createClient({
  url: redisUrl,
  socket: {
    /**
     * Reconnection strategy for Redis client.
     * Returns a timeout in milliseconds or an error if the number of retries exceeds 10.
     * The timeout is calculated as the minimum of the number of retries multiplied by 100 and 3000.
     * This means that the timeout will increase exponentially until it reaches a maximum of 3000 milliseconds.
     * If the number of retries exceeds 10, an error is returned to indicate that the reconnection failed.
     * @param {number} retries - The number of reconnection attempts.
     * @returns {number|Error} - The timeout in milliseconds or an error if the reconnection failed.
     */
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        return new Error('Redis reconnection failed');
      }
      return Math.min(retries * 100, 3000);
    },
  },
});

redisClient.on('error', (err) => logger.error(`Redis Client Error ${err}`));
redisClient.on('ready', () => logger.info('Redis is ready'));

await redisClient.connect().catch((err) => {
  logger.error(`Initial Redis connection failed ${err}`);
  process.exit(1);
});
