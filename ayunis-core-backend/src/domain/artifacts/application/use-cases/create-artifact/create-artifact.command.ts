import { UUID } from 'crypto';
import { AuthorType } from '../../../domain/value-objects/author-type.enum';

export class CreateArtifactCommand {
  readonly threadId: UUID;
  readonly title: string;
  readonly content: string;
  readonly authorType: AuthorType;

  constructor(params: {
    threadId: UUID;
    title: string;
    content: string;
    authorType: AuthorType;
  }) {
    this.threadId = params.threadId;
    this.title = params.title;
    this.content = params.content;
    this.authorType = params.authorType;
  }
}
