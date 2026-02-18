import { UUID } from 'crypto';

export class UpdatePromptCommand {
  constructor(
    public readonly id: UUID,
    public readonly title: string,
    public readonly content: string,
    public readonly userId: UUID,
  ) {}
}
