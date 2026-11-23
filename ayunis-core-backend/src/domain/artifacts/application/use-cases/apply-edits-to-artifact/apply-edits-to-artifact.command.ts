import type { UUID } from 'crypto';
import type { AuthorType } from 'src/domain/artifacts/domain/value-objects/author-type.enum';
import type { ArtifactRun } from 'src/domain/artifacts/application/models/artifact-run';

export interface ArtifactEdit {
  readonly oldText: string;
  readonly newText: string;
}

export class ApplyEditsToArtifactCommand {
  readonly artifactId: UUID;
  readonly edits: ArtifactEdit[];
  readonly authorType: AuthorType;
  readonly expectedVersionNumber?: number;
  readonly run?: ArtifactRun;

  constructor(params: {
    artifactId: UUID;
    edits: ArtifactEdit[];
    authorType: AuthorType;
    expectedVersionNumber?: number;
    run?: ArtifactRun;
  }) {
    this.artifactId = params.artifactId;
    this.edits = params.edits;
    this.authorType = params.authorType;
    this.expectedVersionNumber = params.expectedVersionNumber;
    this.run = params.run;
  }
}
