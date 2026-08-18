import type { UUID } from 'crypto';

export class UnmaskThreadPiiMaskCommand {
  constructor(
    public readonly threadId: UUID,
    public readonly maskId: UUID,
  ) {}
}
