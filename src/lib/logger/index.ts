import pino, { type Logger } from 'pino';
import { config } from '../../config/config';

/**
 * Logger Configuration
 *
 * Provides structured logging using Pino with environment-specific settings:
 * - development/local: Pretty-printed logs with debug level
 * - production: JSON logs with info level
 */

/**
 * Determine log level based on environment
 */
function getLogLevel(): pino.LevelWithSilent {
  if (config.isProd) {
    return 'info';
  }

  return 'debug';
}

/**
 * Check if pino-pretty is available (only in local development with devDependencies)
 */
function isPinoPrettyAvailable(): boolean {
  try {
    // Try to resolve pino-pretty - only available when devDependencies are installed
    require.resolve('pino-pretty');
    return true;
  } catch {
    return false;
  }
}

/**
 * Create Pino logger with environment-specific configuration
 */
function createLogger(): Logger {
  const logLevel = getLogLevel();

  if (config.isProd) {
    return pino({
      level: logLevel,
      formatters: {
        level: (label) => {
          return { level: label };
        },
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    });
  }

  // Use pino-pretty for colorized logs only if available (local dev with devDependencies)
  // In Docker (test mode), pino-pretty won't be available since we use --production install
  if (isPinoPrettyAvailable()) {
    return pino({
      level: logLevel,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      },
    });
  }

  // Fallback to basic JSON logging (used in Docker)
  return pino({
    level: logLevel,
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

/**
 * Base logger instance
 * Use this to create child loggers for specific components
 */
export const logger = createLogger();

/**
 * Create a child logger with a specific name/context
 *
 * @example
 * const authLogger = createChildLogger('auth');
 * authLogger.info('User logged in');
 *
 * @example
 * const dbLogger = createChildLogger('database');
 * dbLogger.debug('Query executed');
 */
export function createChildLogger(name: string, bindings?: Record<string, unknown>): Logger {
  return logger.child({ component: name, ...bindings });
}

/**
 * Re-export Logger type for use in other modules
 */
export type { Logger } from 'pino';
