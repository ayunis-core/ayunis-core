import type { UUID } from 'crypto';

export class FindArtifactWithVersionsQuery {
  readonly artifactId: UUID;

  constructor(params: { artifactId: UUID }) {
    this.artifactId = params.artifactId;
  }
}
