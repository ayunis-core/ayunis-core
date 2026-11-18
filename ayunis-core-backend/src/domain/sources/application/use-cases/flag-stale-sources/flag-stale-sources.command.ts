import type { UUID } from 'crypto';

export class FlagStaleSourcesCommand {
  constructor(
    public readonly orgId: UUID,
    /** Catalog ID of the org's embedding model. */
    public readonly embeddingModelId: UUID,
  ) {}
}
