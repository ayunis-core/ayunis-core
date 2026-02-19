import type { UUID } from 'crypto';

export class ClearDefaultsByCatalogModelIdCommand {
  constructor(public readonly catalogModelId: UUID) {}
}
