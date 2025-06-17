import { UUID } from 'crypto';

export class UpdateThreadInternetSearchCommand {
  constructor(
    public readonly threadId: UUID,
    public readonly userId: UUID,
    public readonly isInternetSearchEnabled: boolean,
  ) {}
}
