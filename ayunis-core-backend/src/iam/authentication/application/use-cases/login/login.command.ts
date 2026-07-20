import type { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';

export class LoginCommand {
  constructor(public readonly user: ActiveUser) {}
}
