import dotenv from 'dotenv';
import { logger } from './src/conf/logger/logger.js';
import { app } from './src/app.js';
dotenv.config();

const { PORT, NODE_ENV } = process.env;
app.listen(PORT, () => {
  logger.info(`Server running in ${NODE_ENV} mode on http://localhost:${PORT}`);
});
