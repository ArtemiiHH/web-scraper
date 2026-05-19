'use strict';

const { createLogger, format, transports } = require('winston');
const settings = require('../config/settings');

const logger = createLogger({
  level: settings.logging.level,
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, stack }) =>
      stack
        ? `${timestamp} [${level.toUpperCase()}] ${message}\n${stack}`
        : `${timestamp} [${level.toUpperCase()}] ${message}`
    )
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message }) =>
          `${timestamp} ${level}: ${message}`
        )
      ),
    }),
    new transports.File({ filename: settings.logging.file }),
  ],
});

module.exports = logger;
