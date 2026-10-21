import type { UUID } from 'crypto';

export class EnqueueDocumentProcessingCommand {
  readonly sourceId: UUID;
  readonly orgId: UUID;
  readonly userId: UUID;
  readonly minioPath: string;
  readonly sha256: string;
  readonly fileName: string;
  readonly fileType: string;

  constructor(params: {
    sourceId: UUID;
    orgId: UUID;
    userId: UUID;
    minioPath: string;
    sha256: string;
    fileName: string;
    fileType: string;
  }) {
    this.sourceId = params.sourceId;
    this.orgId = params.orgId;
    this.userId = params.userId;
    this.minioPath = params.minioPath;
    this.sha256 = params.sha256;
    this.fileName = params.fileName;
    this.fileType = params.fileType;
  }
}
