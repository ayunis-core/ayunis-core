import type { UUID } from 'crypto';

export class FindArtifactWithVersionsQuery {
  readonly artifactId: UUID;
  readonly linkedThreadId?: UUID;

  constructor(params: { artifactId: UUID; linkedThreadId?: UUID }) {
    this.artifactId = params.artifactId;
    this.linkedThreadId = params.linkedThreadId;
  }
}
