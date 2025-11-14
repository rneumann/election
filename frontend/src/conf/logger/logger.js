import log from 'loglevel';

/**
 * Logger-Konfiguration mit loglevel
 * - In der Produktionsumgebung werden nur 'info' und höher geloggt.
 * - In der Entwicklungsumgebung werden 'debug' und höher geloggt.
 * - Browser-kompatibel und mit Zeitstempel
 */

// Set log level based on environment
if (import.meta.env.MODE === 'production') {
  log.setLevel('info');
} else {
  log.setLevel('debug');
}

// Optional: Custom formatting with timestamp
const originalFactory = log.methodFactory;
log.methodFactory = (methodName, logLevel, loggerName) => {
  const rawMethod = originalFactory(methodName, logLevel, loggerName);

  return (...args) => {
    const timestamp = new Date().toISOString();
    rawMethod(`[${timestamp}]`, ...args);
  };
};

// Apply the custom method factory
log.setLevel(log.getLevel());

export const logger = log;
