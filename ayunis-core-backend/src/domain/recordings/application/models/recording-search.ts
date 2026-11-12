import type { UUID } from 'crypto';
import type { TranscriptChunkPosition } from 'src/domain/sources/application/util/transcript-chunks';
import type { ReadableCollectiveOwners } from 'src/iam/teams/application/models/collective-owner.model';

/** A recording is uploaded when it is created, as its page shows. */
export interface UploadTimeRange {
  from?: Date;
  to?: Date;
}

export interface SearchableRecordingFilter {
  userId: UUID;
  owners: ReadableCollectiveOwners;
  /** The workspace of the chat, whose recordings are searched as well. */
  workspaceId: UUID | null;
  uploaded: UploadTimeRange;
}

/** A readable recording whose transcript is indexed under its audio source. */
export interface SearchableRecording {
  id: UUID;
  name: string;
  uploadedAt: Date;
  audioSourceId: UUID;
}

export interface CitedRecording {
  id: UUID;
  name: string;
  uploadedAt: Date;
}

export interface RecordingSearchResult {
  chunkId: UUID;
  content: string;
  recording: CitedRecording;
  position: TranscriptChunkPosition;
  matchedQueries: string[];
}
