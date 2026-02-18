import { UUID } from 'crypto';
import { AuthorType } from '../../../domain/value-objects/author-type.enum';

export class UpdateArtifactCommand {
  readonly artifactId: UUID;
  readonly content: string;
  readonly authorType: AuthorType;

  constructor(params: {
    artifactId: UUID;
    content: string;
    authorType: AuthorType;
  }) {
    this.artifactId = params.artifactId;
    this.content = params.content;
    this.authorType = params.authorType;
  }
}
