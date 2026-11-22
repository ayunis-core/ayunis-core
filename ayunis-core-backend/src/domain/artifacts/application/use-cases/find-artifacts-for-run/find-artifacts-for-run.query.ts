import type { ArtifactRun } from 'src/domain/artifacts/application/models/artifact-run';

export class FindArtifactsForRunQuery {
  readonly run: ArtifactRun;

  constructor(params: { run: ArtifactRun }) {
    this.run = params.run;
  }
}
