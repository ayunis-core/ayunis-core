import { UUID } from 'crypto';
import { UserRole } from '../../../domain/value-objects/role.object';

export class UpdateUserRoleCommand {
  constructor(
    public readonly userId: UUID,
    public readonly newRole: UserRole,
  ) {}
}
