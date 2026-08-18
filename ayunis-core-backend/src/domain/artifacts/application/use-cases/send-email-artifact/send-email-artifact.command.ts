import type { UUID } from 'crypto';

export class SendEmailArtifactCommand {
  readonly artifactId: UUID;

  constructor(params: { artifactId: UUID }) {
    this.artifactId = params.artifactId;
  }
}
