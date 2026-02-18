import { ActiveUser } from '../../../domain/active-user.entity';

export class LoginCommand {
  constructor(public readonly user: ActiveUser) {}
}
