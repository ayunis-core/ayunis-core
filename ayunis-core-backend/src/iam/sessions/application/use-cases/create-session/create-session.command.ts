import type { UUID } from 'crypto';
import type { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';
import type { SessionClient } from 'src/iam/sessions/domain/value-objects/session-client';

export class CreateSessionCommand {
  constructor(
    public readonly userId: UUID,
    public readonly authenticationMethod: SessionAuthenticationMethod,
    public readonly zitadelSessionId: string | null = null,
    public readonly client: SessionClient | null = null,
  ) {}
}
