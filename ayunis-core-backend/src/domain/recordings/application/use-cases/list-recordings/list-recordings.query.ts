import type { RecordingListScope } from 'src/domain/recordings/application/models/recording-owner';

export class ListRecordingsQuery {
  constructor(public readonly scope: RecordingListScope) {}
}
