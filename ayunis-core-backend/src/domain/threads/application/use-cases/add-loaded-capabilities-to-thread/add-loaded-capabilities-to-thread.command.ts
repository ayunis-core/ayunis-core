import type { UUID } from 'crypto';

export class AddLoadedCapabilitiesToThreadCommand {
  constructor(
    public readonly threadId: UUID,
    public readonly capabilityIds: readonly string[],
  ) {}
}
