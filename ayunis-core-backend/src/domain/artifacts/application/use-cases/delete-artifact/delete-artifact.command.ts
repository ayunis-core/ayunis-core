import type { UUID } from 'crypto';

export class DeleteArtifactCommand {
  readonly artifactId: UUID;

  constructor(params: { artifactId: UUID }) {
    this.artifactId = params.artifactId;
  }
}
