import { UUID } from 'crypto';
import { UserRole } from '../../users/domain/value-objects/role.object';

export class ActiveUser {
  constructor(
    public readonly id: UUID,
    public readonly email: string,
    public readonly role: UserRole,
    public readonly orgId: UUID,
    public readonly name: string,
  ) {}
}
