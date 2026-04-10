import type { UUID } from 'crypto';

export class ResolveGeneratedImageQuery {
  constructor(
    public readonly threadId: UUID,
    public readonly imageId: UUID,
    public readonly userId: UUID,
  ) {}
}
