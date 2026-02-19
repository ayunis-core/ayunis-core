import type { UUID } from 'crypto';

export class FindArtifactsByThreadQuery {
  readonly threadId: UUID;

  constructor(params: { threadId: UUID }) {
    this.threadId = params.threadId;
  }
}
