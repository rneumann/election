import os from 'os';
import dotenv from 'dotenv';
import { logger } from './src/conf/logger/logger.js';
import { app } from './src/app.js';
dotenv.config();

const { PORT, NODE_ENV } = process.env;
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
});
