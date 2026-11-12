import type { UUID } from 'crypto';

export class GetSourceTranscriptSegmentsQuery {
  constructor(public readonly sourceId: UUID) {}
}
