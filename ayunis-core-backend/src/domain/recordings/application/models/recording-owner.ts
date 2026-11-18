import type { UUID } from 'crypto';
import type {
  ResourceOwner,
  TransferableResourceOwner,
} from 'src/domain/ownership/application/models/resource-owner';
import type { AbstractRecordingParams } from 'src/domain/recordings/domain/abstract-recording.entity';
import { OrgRecording } from 'src/domain/recordings/domain/org-recording.entity';
import { PersonalRecording } from 'src/domain/recordings/domain/personal-recording.entity';
import type {
  Recording,
  TransferableRecording,
} from 'src/domain/recordings/domain/recording';
import { TeamRecording } from 'src/domain/recordings/domain/team-recording.entity';
import { WorkspaceRecording } from 'src/domain/recordings/domain/workspace-recording.entity';

export type RecordingOwner = ResourceOwner;

export type RecordingTransferOwner = TransferableResourceOwner;

/** The scopes a recording list can be requested for. */
export type RecordingListScope = Extract<
  RecordingOwner,
  { type: 'personal' | 'workspace' }
>;

/**
 * The recording with the given content owned by `owner`; a personal owner is
 * the acting user.
 */
export function recordingOwnedBy(
  owner: RecordingTransferOwner,
  params: AbstractRecordingParams,
  actingUserId: UUID,
): TransferableRecording;
export function recordingOwnedBy(
  owner: RecordingOwner,
  params: AbstractRecordingParams,
  actingUserId: UUID,
): Recording;
export function recordingOwnedBy(
  owner: RecordingOwner,
  params: AbstractRecordingParams,
  actingUserId: UUID,
): Recording {
  switch (owner.type) {
    case 'personal':
      return new PersonalRecording({ ...params, userId: actingUserId });
    case 'workspace':
      return new WorkspaceRecording({
        ...params,
        workspaceId: owner.workspaceId,
      });
    case 'team':
      return new TeamRecording({ ...params, teamId: owner.teamId });
    case 'org':
      return new OrgRecording(params);
  }
}

/** Whether `recording` already belongs to `owner` as seen by the acting user. */
export function isOwnedBy(
  recording: TransferableRecording,
  owner: RecordingTransferOwner,
  actingUserId: UUID,
): boolean {
  switch (owner.type) {
    case 'personal':
      return (
        recording instanceof PersonalRecording &&
        recording.userId === actingUserId
      );
    case 'team':
      return (
        recording instanceof TeamRecording && recording.teamId === owner.teamId
      );
    case 'org':
      return recording instanceof OrgRecording;
  }
}
