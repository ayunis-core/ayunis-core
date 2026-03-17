import type { UUID } from 'crypto';
import type { AuthorType } from '../../../domain/value-objects/author-type.enum';

export class CreateArtifactCommand {
  readonly threadId: UUID;
  readonly title: string;
  readonly content: string;
  readonly authorType: AuthorType;
  readonly letterheadId?: UUID;

  constructor(params: {
    threadId: UUID;
    title: string;
    content: string;
    authorType: AuthorType;
    letterheadId?: UUID;
  }) {
    this.threadId = params.threadId;
    this.title = params.title;
    this.content = params.content;
    this.authorType = params.authorType;
    this.letterheadId = params.letterheadId;
  }
}
