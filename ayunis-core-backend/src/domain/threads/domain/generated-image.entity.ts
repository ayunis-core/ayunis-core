import type { UUID } from 'crypto';

export class GeneratedImage {
  constructor(
    public readonly id: UUID,
    public readonly orgId: UUID,
    public readonly userId: UUID,
    public readonly threadId: UUID,
    public readonly contentType: string,
    public readonly isAnonymous: boolean,
    public readonly storageKey: string,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}
}
