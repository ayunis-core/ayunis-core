import {
  AbstractRecording,
  type AbstractRecordingParams,
} from './abstract-recording.entity';

/** Owned by the organization it belongs to (`orgId`). */
export class OrgRecording extends AbstractRecording {
  constructor(params: AbstractRecordingParams) {
    super(params);
  }
}
