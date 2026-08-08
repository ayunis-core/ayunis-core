import type { UUID } from 'crypto';

export interface UploadedImageRef {
  messageId: UUID;
  index: number;
}

export class DownloadReferenceImagesQuery {
  public readonly threadId: UUID;
  public readonly userId: UUID;
  public readonly uploadedImageRefs: UploadedImageRef[];
  public readonly generatedImageIds: UUID[];

  constructor(params: {
    threadId: UUID;
    userId: UUID;
    uploadedImageRefs: UploadedImageRef[];
    generatedImageIds: UUID[];
  }) {
    this.threadId = params.threadId;
    this.userId = params.userId;
    this.uploadedImageRefs = params.uploadedImageRefs;
    this.generatedImageIds = params.generatedImageIds;
  }
}
