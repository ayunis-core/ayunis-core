import type { UUID } from 'crypto';
import type { AuthorType } from '../../../domain/value-objects/author-type.enum';
import { ArtifactType } from '../../../domain/value-objects/artifact-type.enum';

export class CreateArtifactCommand {
  readonly threadId: UUID;
  readonly type: ArtifactType;
  readonly title: string;
  readonly content: string;
  readonly authorType: AuthorType;
  readonly letterheadId?: UUID;

  constructor(params: {
    threadId: UUID;
    type?: ArtifactType;
    title: string;
    content: string;
    authorType: AuthorType;
    letterheadId?: UUID;
  }) {
    this.threadId = params.threadId;
    this.type = params.type ?? ArtifactType.DOCUMENT;
    this.title = params.title;
    this.content = params.content;
    this.authorType = params.authorType;
    this.letterheadId = params.letterheadId;
  }
}
