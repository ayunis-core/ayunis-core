import type { UUID } from 'crypto';

export class AttachArtifactToThreadCommand {
  readonly threadId: UUID;
  readonly artifactId: UUID;

  constructor(params: { threadId: UUID; artifactId: UUID }) {
    this.threadId = params.threadId;
    this.artifactId = params.artifactId;
  }
}
