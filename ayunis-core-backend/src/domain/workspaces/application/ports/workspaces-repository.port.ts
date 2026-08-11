import type { UUID } from 'crypto';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';

export abstract class WorkspacesRepository {
  /**
   * Ordered by `sortOrder` ascending, ties broken by `updatedAt` descending.
   * `ReorderWorkspacesUseCase` relies on this order when renumbering, so
   * adapters must uphold it.
   */
  abstract findAllByUserId(userId: UUID): Promise<Workspace[]>;
  abstract findById(userId: UUID, id: UUID): Promise<Workspace | null>;
  abstract save(workspace: Workspace): Promise<Workspace>;
  /** Throws `WorkspaceNotFoundError` when the user owns no such workspace. */
  abstract delete(userId: UUID, id: UUID): Promise<void>;

  /**
   * Flips `isPinned` in a single statement. Pinning is not an edit of the
   * workspace itself, so it must not bump `updatedAt` — the list page sorts by
   * it and a pin would otherwise reshuffle "last updated".
   * Throws `WorkspaceNotFoundError` when the user owns no such workspace.
   */
  abstract togglePinned(userId: UUID, id: UUID): Promise<boolean>;

  /** Writes `sortOrder = index` for the given ids. Also leaves `updatedAt` alone. */
  abstract updateSortOrders(userId: UUID, orderedIds: UUID[]): Promise<void>;
}
