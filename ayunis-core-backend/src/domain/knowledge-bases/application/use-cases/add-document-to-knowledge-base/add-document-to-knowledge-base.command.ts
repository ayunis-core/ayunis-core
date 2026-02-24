import type { UUID } from 'crypto';

export class AddDocumentToKnowledgeBaseCommand {
  readonly knowledgeBaseId: UUID;
  readonly userId: UUID;
  readonly fileData: Buffer;
  readonly fileName: string;
  readonly fileType: string;

  constructor(params: {
    knowledgeBaseId: UUID;
    userId: UUID;
    fileData: Buffer;
    fileName: string;
    fileType: string;
  }) {
    this.knowledgeBaseId = params.knowledgeBaseId;
    this.userId = params.userId;
    this.fileData = params.fileData;
    this.fileName = params.fileName;
    this.fileType = params.fileType;
  }
}
