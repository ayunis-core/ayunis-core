import type { Logger } from '@nestjs/common';
import type { DeferredCleanupTask } from './deferred-cleanup.event';

/**
 * Runs deferred cleanup tasks after a successful row delete. Each task is
 * individually error-swallowed: cleanup runs post-delete, so a failure can only
 * be logged as a leak — it must never fail the already-completed deletion.
 */
export async function runDeferredCleanup(
  tasks: DeferredCleanupTask[],
  logger: Logger,
): Promise<void> {
  for (const task of tasks) {
    try {
      await task.run();
    } catch (error) {
      logger.error('Deferred cleanup task failed', {
        label: task.label,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
