import type { UUID } from 'crypto';

export class SaveGeneratedImageCommand {
  public readonly orgId: UUID;
  public readonly userId: UUID;
  public readonly threadId: UUID;
  public readonly imageData: Buffer;
  public readonly contentType: string;
  public readonly isAnonymous: boolean;

  constructor(params: {
    orgId: UUID;
    userId: UUID;
    threadId: UUID;
    imageData: Buffer;
    contentType: string;
    isAnonymous: boolean;
  }) {
    this.orgId = params.orgId;
    this.userId = params.userId;
    this.threadId = params.threadId;
    this.imageData = params.imageData;
    this.contentType = params.contentType;
    this.isAnonymous = params.isAnonymous;
  }
}
