import type { Logger } from '@nestjs/common';
import type { ContextService } from 'src/common/context/services/context.service';

/**
 * Extracts common metric labels from the request context.
 * Falls back to 'unknown' when context values are unavailable
 * (e.g., in background jobs or during context propagation failures).
 */
export function getUserContextLabels(contextService: ContextService): {
  user_id: string;
  org_id: string;
} {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- undefined at runtime when context not propagated
    user_id: contextService.get('userId') ?? 'unknown',
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- undefined at runtime when context not propagated
    org_id: contextService.get('orgId') ?? 'unknown',
  };
}

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
