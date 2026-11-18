import type { UUID } from 'crypto';
import type { RecordingTransferOwner } from 'src/domain/recordings/application/models/recording-owner';

export class ChangeRecordingOwnerCommand {
  constructor(
    public readonly recordingId: UUID,
    public readonly owner: RecordingTransferOwner,
  ) {}
}
