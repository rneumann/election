import winston from 'winston';
const { combine, timestamp, printf, colorize, align } = winston.format;
const { NODE_ENV } = process.env;

/**
 * Logger-Konfiguration mit Winston
 * - In der Produktionsumgebung werden nur 'info' und höher geloggt.
 * - In der Entwicklungsumgebung werden 'debug' und höher geloggt.
 * - Log-Nachrichten enthalten Zeitstempel und sind farbig formatiert.
 */
export const logger = winston.createLogger({
  level: NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    colorize({ all: true }),
    timestamp({
      format: 'YYYY-MM-DD hh:mm:ss.SSS A',
    }),
    align(),
    printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`),
  ),
  transports: [new winston.transports.Console()],
});
