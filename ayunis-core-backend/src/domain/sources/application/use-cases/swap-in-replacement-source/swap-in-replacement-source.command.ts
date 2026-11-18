import type { UUID } from 'crypto';

export class SwapInReplacementSourceCommand {
  constructor(
    public readonly replacementId: UUID,
    public readonly orgId: UUID,
    /** The name the replacement takes, e.g. after a rename meanwhile. */
    public readonly name: string,
  ) {}
}
