import type { OrgRecording } from './org-recording.entity';
import type { PersonalRecording } from './personal-recording.entity';
import type { TeamRecording } from './team-recording.entity';
import type { WorkspaceRecording } from './workspace-recording.entity';

export type CollectiveRecording = TeamRecording | OrgRecording;

/** The recordings that can move between owners; workspace ones stay put. */
export type TransferableRecording = PersonalRecording | CollectiveRecording;

export type Recording = WorkspaceRecording | TransferableRecording;
