import type { UUID } from 'crypto';

export class FindCitedRecordingQuery {
  constructor(
    public readonly recordingId: UUID,
    /** The workspace of the chat citing it, if any. */
    public readonly workspaceId: UUID | null,
  ) {}
}
