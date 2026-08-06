import type { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import type { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';

export class LoginCommand {
  constructor(
    public readonly user: ActiveUser,
    public readonly authenticationMethod: SessionAuthenticationMethod,
  ) {}
}
