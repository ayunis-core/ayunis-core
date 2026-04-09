import type { UUID } from 'crypto';

export class GetAvailableImageGenerationModelsQuery {
  constructor(public readonly orgId: UUID) {}
}
