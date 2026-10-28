import type { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import type { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';

export class StartAuthenticatedSessionCommand {
  constructor(
    public readonly user: ActiveUser,
    public readonly authenticationMethod: SessionAuthenticationMethod,
    public readonly zitadelSessionId: string | null = null,
    public readonly brokerMfaSatisfied = false,
  ) {}
}
