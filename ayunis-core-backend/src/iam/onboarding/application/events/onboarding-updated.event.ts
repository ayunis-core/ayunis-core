import type { UUID } from 'crypto';

export class OnboardingUpdatedEvent {
  static readonly EVENT_NAME = 'onboarding.updated';

  constructor(
    public readonly userId: UUID,
    public readonly previousCompletedStepIds: string[],
    public readonly completedStepIds: string[],
    public readonly previousHidden: boolean,
    public readonly hidden: boolean,
  ) {}
}
