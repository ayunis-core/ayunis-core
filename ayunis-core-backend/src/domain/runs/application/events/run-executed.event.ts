import type { UUID } from 'crypto';
import type { PrincipalKind } from 'src/iam/authentication/domain/active-principal.entity';

export class RunExecutedEvent {
  static readonly EVENT_NAME = 'run.executed';

  constructor(
    public readonly principalKind: PrincipalKind,
    /** Set only when principalKind === 'user'. */
    public readonly userId: UUID | null,
    /** Set only when principalKind === 'apiKey'. */
    public readonly apiKeyId: UUID | null,
    public readonly orgId: UUID,
  ) {}
}
