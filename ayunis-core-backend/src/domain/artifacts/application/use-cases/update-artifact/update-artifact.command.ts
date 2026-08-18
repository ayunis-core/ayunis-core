import type { UUID } from 'crypto';
import type { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';

export class UpdateArtifactCommand {
  readonly artifactId: UUID;
  readonly title?: string;
  readonly content?: string;
  readonly authorType?: AuthorType;
  readonly expectedVersionNumber?: number;
  readonly letterheadId?: UUID | null;

  constructor(params: {
    artifactId: UUID;
    title?: string;
    content?: string;
    authorType?: AuthorType;
    expectedVersionNumber?: number;
    letterheadId?: UUID | null;
  }) {
    this.artifactId = params.artifactId;
    this.title = params.title;
    this.content = params.content;
    this.authorType = params.authorType;
    this.expectedVersionNumber = params.expectedVersionNumber;
    this.letterheadId = params.letterheadId;
  }
}
