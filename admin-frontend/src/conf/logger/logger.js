import log from "loglevel";

/**
 * Logger-Konfiguration mit loglevel
 * - In der Produktionsumgebung werden nur 'info' und höher geloggt.
 * - In der Entwicklungsumgebung werden 'debug' und höher geloggt.
 * - Browser-kompatibel und mit Zeitstempel
 * - Log-Level kann über VITE_LOG_LEVEL Environment-Variable überschrieben werden
 */

// Custom formatting with timestamp
const originalFactory = log.methodFactory;
log.methodFactory = (methodName, logLevel, loggerName) => {
  const rawMethod = originalFactory(methodName, logLevel, loggerName);

  return (...args) => {
    const timestamp = new Date().toISOString();
    rawMethod(`[${timestamp}]`, ...args);
  };
};

// Set log level based on environment (only once, after methodFactory is set)
const logLevel =
  import.meta.env.VITE_LOG_LEVEL ||
  (import.meta.env.MODE === "production" ? "info" : "debug");
log.setLevel(logLevel);

export const logger = log;
