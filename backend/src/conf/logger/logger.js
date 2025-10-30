import winston from 'winston';
const { combine, timestamp, printf, colorize, align } = winston.format;
const { LOG_LEVEL } = process.env;

export const logger = winston.createLogger({
  level: LOG_LEVEL || 'info',
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
