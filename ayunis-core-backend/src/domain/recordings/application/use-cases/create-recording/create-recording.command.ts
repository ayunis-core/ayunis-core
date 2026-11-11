import type { RecordingOwner } from 'src/domain/recordings/application/models/recording-owner';

export class CreateRecordingCommand {
  constructor(
    public readonly name: string,
    public readonly owner: RecordingOwner,
  ) {}
}
