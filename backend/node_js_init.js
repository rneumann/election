import http from 'http';
import { logger } from './src/conf/logger/logger.js';

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hallo Herr Rainer!\n');
});

server.listen(port, hostname, () => {
  logger.info(`Server running at http://${hostname}:${port}/`);
});
