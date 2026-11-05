import type { UUID } from 'crypto';

export class CreateKnowledgeBaseUploadCommand {
  readonly knowledgeBaseId: UUID;
  readonly fileName: string;
  readonly mimeType: string;
  readonly fileSize: number;

  constructor(params: {
    knowledgeBaseId: UUID;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }) {
    this.knowledgeBaseId = params.knowledgeBaseId;
    this.fileName = params.fileName;
    this.mimeType = params.mimeType;
    this.fileSize = params.fileSize;
  }
}
