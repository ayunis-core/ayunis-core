import type { UUID } from 'crypto';
import type { SessionAuthenticationMethod } from '../../../domain/value-objects/session-authentication-method.enum';

export class CreateSessionCommand {
  constructor(
    public readonly userId: UUID,
    public readonly authenticationMethod: SessionAuthenticationMethod,
  ) {}
}
