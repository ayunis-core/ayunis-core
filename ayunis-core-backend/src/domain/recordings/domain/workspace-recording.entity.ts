import type { UUID } from 'crypto';
import {
  AbstractRecording,
  type AbstractRecordingParams,
} from './abstract-recording.entity';

export class WorkspaceRecording extends AbstractRecording {
  readonly workspaceId: UUID;

  constructor(params: AbstractRecordingParams & { workspaceId: UUID }) {
    super(params);
    this.workspaceId = params.workspaceId;
  }
}
