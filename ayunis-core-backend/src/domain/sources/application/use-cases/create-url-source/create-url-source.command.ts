import { UUID } from 'crypto';

export class CreateUrlSourceCommand {
  threadId?: UUID;
  userId: UUID;
  url: string;

  constructor(params: { threadId?: UUID; userId: UUID; url: string }) {
    this.threadId = params.threadId;
    this.userId = params.userId;
    this.url = params.url;
  }
}
