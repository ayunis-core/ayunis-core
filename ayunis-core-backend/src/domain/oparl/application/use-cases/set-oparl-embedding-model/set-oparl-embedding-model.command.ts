import type { UUID } from 'crypto';

export class SetOparlEmbeddingModelCommand {
  constructor(readonly modelId: UUID) {}
}
