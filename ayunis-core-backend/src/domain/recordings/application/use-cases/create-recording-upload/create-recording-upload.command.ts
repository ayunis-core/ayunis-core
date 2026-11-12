import type { UUID } from 'crypto';

export class CreateRecordingUploadCommand {
  readonly recordingId: UUID;
  readonly fileName: string;
  /** MIME type as declared by the browser; may be empty or generic. */
  readonly mimeType: string;
  readonly fileSize: number;

  constructor(params: {
    recordingId: UUID;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }) {
    this.recordingId = params.recordingId;
    this.fileName = params.fileName;
    this.mimeType = params.mimeType;
    this.fileSize = params.fileSize;
  }
}
