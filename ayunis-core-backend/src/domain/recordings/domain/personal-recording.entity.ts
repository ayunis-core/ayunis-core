import type { UUID } from 'crypto';
import {
  AbstractRecording,
  type AbstractRecordingParams,
} from './abstract-recording.entity';

export class PersonalRecording extends AbstractRecording {
  readonly userId: UUID;

  constructor(params: AbstractRecordingParams & { userId: UUID }) {
    super(params);
    this.userId = params.userId;
  }
}
