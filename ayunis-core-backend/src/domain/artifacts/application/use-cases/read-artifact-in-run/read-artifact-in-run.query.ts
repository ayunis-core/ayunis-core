import type { UUID } from 'crypto';
import type { ArtifactRun } from 'src/domain/artifacts/application/models/artifact-run';

export class ReadArtifactInRunQuery {
  readonly artifactId: UUID;
  readonly run: ArtifactRun;

  constructor(params: { artifactId: UUID; run: ArtifactRun }) {
    this.artifactId = params.artifactId;
    this.run = params.run;
  }
}
