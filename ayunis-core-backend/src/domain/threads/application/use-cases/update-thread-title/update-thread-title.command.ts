import { UUID } from 'crypto';

export class UpdateThreadTitleCommand {
  public readonly threadId: UUID;
  public readonly title: string;

  constructor(params: { threadId: UUID; title: string }) {
    this.threadId = params.threadId;
    this.title = params.title;
  }
}
