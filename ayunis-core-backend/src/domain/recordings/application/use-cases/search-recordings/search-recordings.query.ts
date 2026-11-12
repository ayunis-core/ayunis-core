import type { UUID } from 'crypto';
import type { UploadTimeRange } from 'src/domain/recordings/application/models/recording-search';

export class SearchRecordingsQuery {
  constructor(
    public readonly queries: string[],
    /** The workspace of the chat searching, if any. */
    public readonly workspaceId: UUID | null,
    public readonly uploaded: UploadTimeRange = {},
  ) {}
}
