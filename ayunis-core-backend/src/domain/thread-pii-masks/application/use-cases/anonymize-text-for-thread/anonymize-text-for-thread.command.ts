import type { UUID } from 'crypto';

export class AnonymizeTextForThreadCommand {
  constructor(
    public readonly text: string,
    public readonly orgId: UUID,
    public readonly threadId: UUID,
  ) {}
}
