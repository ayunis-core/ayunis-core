import type { Logger } from '@nestjs/common';

/**
 * Wraps a metric operation in a try/catch so that metric failures
 * never crash the main business flow. Logs a warning on failure.
 */
export function safeMetric(logger: Logger, fn: () => void): void {
  try {
    fn();
  } catch (error) {
    logger.warn('Metric recording failed', { error: error as Error });
  }
}
