import type { UUID } from 'crypto';

export class SetOparlEmbeddingModelIdCommand {
  constructor(public readonly modelId: UUID) {}
}
