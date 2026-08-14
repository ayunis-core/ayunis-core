import type { PinoLogger } from 'nestjs-pino';

/**
 * Wraps a metric operation in a try/catch so that metric failures
 * never crash the main business flow. Logs a warning on failure.
 */
export function safeMetric(logger: PinoLogger, fn: () => void): void {
  try {
    fn();
  } catch (error) {
    logger.warn({ err: error }, 'Metric recording failed');
  }
}
