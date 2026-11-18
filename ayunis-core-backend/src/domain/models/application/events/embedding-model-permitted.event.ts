import type { UUID } from 'crypto';

/**
 * Emitted inside the transaction that stores an org's permit for an
 * embedding model. Listeners write in that transaction, so the permit only
 * commits together with their changes (sources flagged for re-indexing), and
 * register work outside the database, such as queueing jobs, with
 * {@link afterCommit}: a job must not start before the rows it reads exist.
 */
export class EmbeddingModelPermittedEvent {
  static readonly EVENT_NAME = 'models.embedding-model-permitted';

  private afterCommitTasks: (() => Promise<void>)[] = [];

  constructor(
    public readonly orgId: UUID,
    /** Catalog ID of the permitted embedding model. */
    public readonly embeddingModelId: UUID,
  ) {}

  afterCommit(task: () => Promise<void>): void {
    this.afterCommitTasks.push(task);
  }

  /** Drains the tasks, so they run once however often this is called. */
  takeAfterCommitTasks(): (() => Promise<void>)[] {
    const tasks = this.afterCommitTasks;
    this.afterCommitTasks = [];
    return tasks;
  }
}
