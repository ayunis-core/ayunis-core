import { User } from 'src/iam/users/domain/user.entity';

export class SendConfirmationEmailCommand {
  constructor(public readonly user: User) {}
}
