import type { UUID } from 'crypto';

export class DeleteRecordingCommand {
  constructor(public readonly recordingId: UUID) {}
}
