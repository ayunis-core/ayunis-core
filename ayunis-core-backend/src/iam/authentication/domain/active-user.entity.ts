import type { UUID } from 'crypto';
import type { UserRole } from '../../users/domain/value-objects/role.object';
import type { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { ActivePrincipal } from './active-principal.entity';

export class ActiveUser extends ActivePrincipal {
  readonly kind = 'user' as const;
  readonly id: UUID;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly name: string;

  constructor(params: {
    id: UUID;
    email: string;
    emailVerified: boolean;
    role: UserRole;
    systemRole: SystemRole;
    orgId: UUID;
    name: string;
  }) {
    super({
      orgId: params.orgId,
      role: params.role,
      systemRole: params.systemRole,
    });
    this.id = params.id;
    this.email = params.email;
    this.emailVerified = params.emailVerified;
    this.name = params.name;
  }
}
