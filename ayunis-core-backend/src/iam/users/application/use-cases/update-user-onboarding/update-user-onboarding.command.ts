import type { UUID } from 'crypto';

export class UpdateUserOnboardingCommand {
  constructor(
    public readonly userId: UUID,
    public readonly completedStepIds: string[],
    public readonly hidden: boolean,
  ) {}
}
