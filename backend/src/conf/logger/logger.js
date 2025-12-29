import winston from 'winston';
const { combine, timestamp, printf, colorize, align, splat } = winston.format; // 1. splat importieren
const { NODE_ENV } = process.env;

/**
 * Logger
 * @type {winston.Logger}
 * @description Logger config for the application
 */
export const logger = winston.createLogger({
  level: NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    colorize({ all: true }),
    splat(),
    timestamp({
      format: 'YYYY-MM-DD hh:mm:ss.SSS A',
    }),
    align(),
    printf((info) => {
      // 3. Extrahiere alle Metadaten außer den Standard-Feldern
      const { timestamp, level, message, ...rest } = info;

      const meta = Object.keys(rest).length ? JSON.stringify(rest) : '';

      return `[${timestamp}] ${level}: ${message} ${meta}`;
    }),
  ),
  transports: [new winston.transports.Console()],
});
