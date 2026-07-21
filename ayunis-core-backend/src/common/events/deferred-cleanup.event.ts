export interface DeferredCleanupTask {
  label: string;
  run: () => Promise<void>;
}

/**
 * Base class for deletion-lifecycle events implementing a two-phase cleanup
 * contract:
 *
 * 1. The emitting use case awaits the event *before* the row delete. Listeners
 *    may read rows to resolve cleanup targets (the cascade is about to destroy
 *    them) but must not perform irreversible side effects; instead they
 *    register the cleanup work via {@link deferCleanup}.
 * 2. The use case performs the cascading row delete.
 * 3. Only after the delete succeeds does the use case drain the tasks via
 *    {@link takeCleanupTasks} and run them (see `runDeferredCleanup`).
 *
 * A failed delete therefore loses nothing, and a failed cleanup leaks orphaned
 * external data instead of destroying data of a still-existing tenant.
 *
 * Deferred tasks must be independent of one another: with multiple listeners
 * the registration order follows listener registration order, which is not a
 * contract.
 */
export abstract class DeferredCleanupEvent {
  private cleanupTasks: DeferredCleanupTask[] = [];

  deferCleanup(label: string, run: () => Promise<void>): void {
    this.cleanupTasks.push({ label, run });
  }

  // Draining accessor so a re-emitted or double-processed event can never run
  // irreversible cleanup twice.
  takeCleanupTasks(): DeferredCleanupTask[] {
    const tasks = this.cleanupTasks;
    this.cleanupTasks = [];
    return tasks;
  }
}
