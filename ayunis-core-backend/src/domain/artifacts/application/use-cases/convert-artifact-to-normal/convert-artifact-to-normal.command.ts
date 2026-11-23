import type { UUID } from 'crypto';

export class ConvertArtifactToNormalCommand {
  readonly artifactId: UUID;

  constructor(params: { artifactId: UUID }) {
    this.artifactId = params.artifactId;
  }
}
