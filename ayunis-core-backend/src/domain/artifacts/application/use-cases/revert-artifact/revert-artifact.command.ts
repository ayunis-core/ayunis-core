import type { UUID } from 'crypto';

export class RevertArtifactCommand {
  readonly artifactId: UUID;
  readonly versionNumber: number;

  constructor(params: { artifactId: UUID; versionNumber: number }) {
    this.artifactId = params.artifactId;
    this.versionNumber = params.versionNumber;
  }
}
