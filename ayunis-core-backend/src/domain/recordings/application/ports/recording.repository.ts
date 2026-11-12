import type { UUID } from 'crypto';
import type { Recording } from 'src/domain/recordings/domain/recording';
import type { WorkspaceRecording } from 'src/domain/recordings/domain/workspace-recording.entity';
import type { ReadableCollectiveOwners } from 'src/iam/teams/application/models/collective-owner.model';

export abstract class RecordingRepository {
  abstract findById(
    id: UUID,
    options?: { lock?: boolean },
  ): Promise<Recording | null>;
  /** The user's own recordings plus those of the given teams and organization. */
  abstract findAllReadable(
    userId: UUID,
    collectiveOwners: ReadableCollectiveOwners,
  ): Promise<Recording[]>;
  abstract findAllByWorkspaceId(
    workspaceId: UUID,
  ): Promise<WorkspaceRecording[]>;
  abstract findAllByTeamId(teamId: UUID): Promise<Recording[]>;
  abstract findAllByOrgId(orgId: UUID): Promise<Recording[]>;
  /**
   * The recordings deleting the user deletes: their personal ones and those of
   * workspaces they own.
   */
  abstract findAllDeletedWithUser(userId: UUID): Promise<Recording[]>;
  abstract save(recording: Recording): Promise<Recording>;
  abstract delete(recording: Recording): Promise<void>;
}
