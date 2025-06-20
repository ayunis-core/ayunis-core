import { UUID } from 'crypto';

export class UpdatePasswordCommand {
  constructor(
    public readonly userId: UUID,
    public readonly currentPassword: string,
    public readonly newPassword: string,
    public readonly newPasswordConfirmation: string,
  ) {}
}
