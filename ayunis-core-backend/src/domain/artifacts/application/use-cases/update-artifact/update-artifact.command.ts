import type { UUID } from 'crypto';
import type { AuthorType } from '../../../domain/value-objects/author-type.enum';

export class UpdateArtifactCommand {
  readonly artifactId: UUID;
  readonly content: string;
  readonly authorType: AuthorType;
  readonly expectedVersionNumber?: number;

  constructor(params: {
    artifactId: UUID;
    content: string;
    authorType: AuthorType;
    expectedVersionNumber?: number;
  }) {
    this.artifactId = params.artifactId;
    this.content = params.content;
    this.authorType = params.authorType;
    this.expectedVersionNumber = params.expectedVersionNumber;
  }
}
