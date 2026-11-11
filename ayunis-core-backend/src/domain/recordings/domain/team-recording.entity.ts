import type { UUID } from 'crypto';
import {
  AbstractRecording,
  type AbstractRecordingParams,
} from './abstract-recording.entity';

export class TeamRecording extends AbstractRecording {
  readonly teamId: UUID;

  constructor(params: AbstractRecordingParams & { teamId: UUID }) {
    super(params);
    this.teamId = params.teamId;
  }
}
