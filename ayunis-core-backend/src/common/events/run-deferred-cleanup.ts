import type { DeferredCleanupTask } from './deferred-cleanup.event';

interface StructuredErrorLogger {
  error(metadata: object, message: string): void;
}

/**
 * Runs deferred cleanup tasks after a successful row delete. Each task is
 * individually error-swallowed: cleanup runs post-delete, so a failure can only
 * be logged as a leak — it must never fail the already-completed deletion.
 */
export async function runDeferredCleanup(
  tasks: DeferredCleanupTask[],
  logger: StructuredErrorLogger,
): Promise<void> {
  for (const task of tasks) {
    try {
      await task.run();
    } catch (error) {
      logger.error(
        {
          label: task.label,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Deferred cleanup task failed',
      );
    }
  }
}
