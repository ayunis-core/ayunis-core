import type { UUID } from 'crypto';
import type { PrincipalKind } from 'src/iam/authentication/domain/active-principal.entity';

export class ToolUsedEvent {
  static readonly EVENT_NAME = 'run.tool-used';

  constructor(
    public readonly principalKind: PrincipalKind,
    /** Set only when principalKind === 'user'. */
    public readonly userId: UUID | null,
    /** Set only when principalKind === 'apiKey'. */
    public readonly apiKeyId: UUID | null,
    public readonly orgId: UUID,
    public readonly toolName: string,
  ) {}
}
