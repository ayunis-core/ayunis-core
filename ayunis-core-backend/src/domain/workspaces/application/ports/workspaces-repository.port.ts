import type { UUID } from 'crypto';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';

export interface WorkspaceThreadStats {
  chatCount: number;
  lastActivityAt: Date | null;
}

export abstract class WorkspacesRepository {
  /**
   * Ordered by the caller's `sortOrder` ascending — never-ordered workspaces
   * sort last — with ties broken by `updatedAt` descending.
   * `ReorderWorkspacesUseCase` relies on this order when renumbering, so
   * adapters must uphold it.
   */
  abstract findAllByUserId(userId: UUID): Promise<Workspace[]>;

  /**
   * Chat count and latest chat activity per workspace, for the list page.
   * Missing entries mean "no chats".
   */
  abstract getThreadStats(
    workspaceIds: UUID[],
  ): Promise<Map<UUID, WorkspaceThreadStats>>;
  abstract findById(userId: UUID, id: UUID): Promise<Workspace | null>;
  /**
   * Persists the workspace's own fields only. The caller's pin state and
   * manual order are written by `saveSettings`, `togglePinned` and
   * `updateSortOrders` — never here, so a plain rename cannot overwrite them.
   */
  abstract save(workspace: Workspace): Promise<Workspace>;
  /**
   * Writes the owner's pin state and manual order for this workspace in one
   * atomic upsert. Used on creation; later changes go through the dedicated
   * `togglePinned` / `updateSortOrders` paths.
   */
  abstract saveSettings(workspace: Workspace): Promise<void>;
  /** Throws `WorkspaceNotFoundError` when the user owns no such workspace. */
  abstract delete(userId: UUID, id: UUID): Promise<void>;

  /**
   * Flips the caller's `isPinned` for this workspace. Pin state is per user
   * (stored on `workspace_user_settings`), and it is not an edit of the
   * workspace itself, so `updatedAt` stays put — the list page sorts by it
   * and a pin would otherwise reshuffle "last updated".
   * Throws `WorkspaceNotFoundError` when the user owns no such workspace.
   */
  abstract togglePinned(userId: UUID, id: UUID): Promise<boolean>;

  /** Writes the caller's `sortOrder = index` for the given ids. Also leaves `updatedAt` alone. */
  abstract updateSortOrders(userId: UUID, orderedIds: UUID[]): Promise<void>;
}
