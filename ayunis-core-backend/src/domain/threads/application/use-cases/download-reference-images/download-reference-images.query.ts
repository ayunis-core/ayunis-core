import type { UUID } from 'crypto';

export class DownloadReferenceImagesQuery {
  public readonly threadId: UUID;
  public readonly userId: UUID;
  public readonly includeUploadedImages: boolean;
  public readonly generatedImageIds: UUID[];

  constructor(params: {
    threadId: UUID;
    userId: UUID;
    includeUploadedImages: boolean;
    generatedImageIds: UUID[];
  }) {
    this.threadId = params.threadId;
    this.userId = params.userId;
    this.includeUploadedImages = params.includeUploadedImages;
    this.generatedImageIds = params.generatedImageIds;
  }
}
