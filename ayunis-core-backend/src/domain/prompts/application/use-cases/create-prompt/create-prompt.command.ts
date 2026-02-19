import type { UUID } from 'crypto';

export class CreatePromptCommand {
  constructor(
    public readonly title: string,
    public readonly content: string,
    public readonly userId: UUID,
  ) {}
}
