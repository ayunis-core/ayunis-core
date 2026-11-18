import type { UUID } from 'crypto';

export class IndexTranscriptSummaryCommand {
  constructor(
    public readonly sourceId: UUID,
    public readonly orgId: UUID,
    /** Markdown. */
    public readonly summary: string,
  ) {}
}
