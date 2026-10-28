import type { UUID } from 'crypto';
import type { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';

export class CreateSessionCommand {
  constructor(
    public readonly userId: UUID,
    public readonly authenticationMethod: SessionAuthenticationMethod,
    public readonly zitadelSessionId: string | null = null,
  ) {}
}
