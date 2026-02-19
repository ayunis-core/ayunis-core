import type { UUID } from 'crypto';

export class DeletePromptCommand {
  constructor(
    public readonly id: UUID,
    public readonly userId: UUID,
  ) {}
}
