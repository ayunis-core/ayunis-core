import type { UUID } from 'crypto';
import type { AuthorType } from '../../../domain/value-objects/author-type.enum';

export class UpdateArtifactCommand {
  readonly artifactId: UUID;
  readonly content: string;
  readonly authorType: AuthorType;
  readonly letterheadId?: UUID | null;

  constructor(params: {
    artifactId: UUID;
    content: string;
    authorType: AuthorType;
    letterheadId?: UUID | null;
  }) {
    this.artifactId = params.artifactId;
    this.content = params.content;
    this.authorType = params.authorType;
    this.letterheadId = params.letterheadId;
  }
}
