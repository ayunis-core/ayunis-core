import type { UUID } from 'crypto';
import type { AuthorType } from '../../../domain/value-objects/author-type.enum';

export interface ArtifactEdit {
  readonly oldText: string;
  readonly newText: string;
}

export class ApplyEditsToArtifactCommand {
  readonly artifactId: UUID;
  readonly edits: ArtifactEdit[];
  readonly authorType: AuthorType;
  readonly expectedVersionNumber?: number;

  constructor(params: {
    artifactId: UUID;
    edits: ArtifactEdit[];
    authorType: AuthorType;
    expectedVersionNumber?: number;
  }) {
    this.artifactId = params.artifactId;
    this.edits = params.edits;
    this.authorType = params.authorType;
    this.expectedVersionNumber = params.expectedVersionNumber;
  }
}
