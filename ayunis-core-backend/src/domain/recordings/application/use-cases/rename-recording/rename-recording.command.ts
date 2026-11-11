import type { UUID } from 'crypto';

export class RenameRecordingCommand {
  constructor(
    public readonly recordingId: UUID,
    public readonly name: string,
  ) {}
}
