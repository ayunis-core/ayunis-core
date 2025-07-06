import { UUID } from 'crypto';

export class UpdateThreadModelCommand {
  constructor(
    public readonly threadId: UUID,
    public readonly userId: UUID,
    public readonly modelId: UUID,
  ) {}
}
