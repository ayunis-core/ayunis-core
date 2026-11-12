import type { UUID } from 'crypto';
import type { RecordingAudio } from 'src/domain/recordings/application/models/recording-audio';
import type {
  SearchableRecording,
  SearchableRecordingFilter,
} from 'src/domain/recordings/application/models/recording-search';
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
  /**
   * The readable recordings whose transcript is indexed, in one query: the
   * user's own, those of the given teams, organization and workspace.
   */
  abstract findSearchable(
    filter: SearchableRecordingFilter,
  ): Promise<SearchableRecording[]>;
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
  /** The uploaded audio of each recording that has one, by recording id. */
  abstract findAudio(recordingIds: UUID[]): Promise<Map<UUID, RecordingAudio>>;
  /**
   * Makes the source the recording's audio, within the ambient transaction.
   * False when the recording already has audio.
   */
  abstract attachAudio(recordingId: UUID, sourceId: UUID): Promise<boolean>;
  abstract delete(recording: Recording): Promise<void>;
}
