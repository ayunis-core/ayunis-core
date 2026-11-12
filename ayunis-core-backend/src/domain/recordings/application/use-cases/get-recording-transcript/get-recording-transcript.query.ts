import type { UUID } from 'crypto';

export class GetRecordingTranscriptQuery {
  constructor(public readonly recordingId: UUID) {}
}
