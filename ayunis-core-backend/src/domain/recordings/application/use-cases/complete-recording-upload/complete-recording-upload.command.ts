import type { UUID } from 'crypto';

export class CompleteRecordingUploadCommand {
  constructor(
    public readonly recordingId: UUID,
    public readonly uploadId: UUID,
  ) {}
}
