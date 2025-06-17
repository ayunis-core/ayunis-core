import { UUID } from 'crypto';

export class UpdateThreadTitleCommand {
  constructor(
    public readonly threadId: UUID,
    public readonly userId: UUID,
    public readonly title: string,
  ) {}
}
