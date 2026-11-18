import type { UUID } from 'crypto';

export class EnqueueDocumentProcessingCommand {
  readonly sourceId: UUID;
  readonly orgId: UUID;
  readonly userId: UUID;
  readonly minioPath: string;
  readonly fileName: string;
  readonly fileType: string;
  readonly retainFile: boolean;
  readonly expectedSize?: number;
  readonly expectedETag?: string;
  readonly keepTranscriptSegments: boolean;

  constructor(params: {
    sourceId: UUID;
    orgId: UUID;
    userId: UUID;
    minioPath: string;
    fileName: string;
    fileType: string;
    retainFile?: boolean;
    expectedSize?: number;
    expectedETag?: string;
    keepTranscriptSegments?: boolean;
  }) {
    this.sourceId = params.sourceId;
    this.orgId = params.orgId;
    this.userId = params.userId;
    this.minioPath = params.minioPath;
    this.fileName = params.fileName;
    this.fileType = params.fileType;
    this.retainFile = params.retainFile ?? false;
    this.expectedSize = params.expectedSize;
    this.expectedETag = params.expectedETag;
    this.keepTranscriptSegments = params.keepTranscriptSegments ?? false;
  }
}
