import os from 'os';
import dotenv from 'dotenv';
import { logger } from './src/conf/logger/logger.js';
import { app } from './src/app.js';
import { connectDb } from './src/database/db.js';
import { swaggerSpec } from './src/conf/swagger/swagger.js';
// NEU: Audit Log Import
import { writeAuditLog } from './src/audit/auditLogger.js';
import { connectDbWithRetry } from './src/database/db-connect-retries.js';

dotenv.config();

const { PORT, NODE_ENV } = process.env;

await connectDbWithRetry(connectDb, {
  retries: 5,
  initialDelayMs: 2000,
  backoffFactor: 2,
});

app.listen(PORT, () => {
  logger.info(String.raw`

'    ######## ##       ########  ######  ######## ####  #######  ##    ##    
'    ##       ##       ##       ##    ##    ##     ##  ##     ## ###   ##    
'    ##       ##       ##       ##          ##     ##  ##     ## ####  ##    
'    ######   ##       ######   ##          ##     ##  ##     ## ## ## ##    
'    ##       ##       ##       ##          ##     ##  ##     ## ##  ####    
'    ##       ##       ##       ##    ##    ##     ##  ##     ## ##   ###    
'    ######## ######## ########  ######     ##    ####  #######  ##    ##   
 
    `);
  logger.info(`Server running on port: ${PORT}`);
  logger.info(`Environment: ${NODE_ENV}`);
  logger.info(`Hostname: ${os.hostname()}`);
  logger.info(`Node Verison: ${process.version}`);
  logger.info(`Swagger: ${swaggerSpec.info.version}`);
  logger.info(`Swagger-Endpoint: http://localhost:${PORT}/api-docs`);

  // NEU: Audit Log beim Start
  writeAuditLog({
    actionType: 'SYSTEM_STARTUP',
    level: 'INFO',
    actorId: 'system',
    actorRole: 'system',
    details: {
      port: PORT,
      environment: NODE_ENV,
      hostname: os.hostname(),
      node_version: process.version,
    },
  }).catch((err) => logger.error('Startup Audit Log failed:', err));
});
