import type { UUID } from 'crypto';
import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { ActivePrincipal } from './active-principal.entity';

export class ActiveApiKey extends ActivePrincipal {
  readonly kind = 'apiKey' as const;
  readonly apiKeyId: UUID;
  readonly label: string;

  constructor(params: {
    apiKeyId: UUID;
    label: string;
    orgId: UUID;
    role: UserRole;
    systemRole: SystemRole;
  }) {
    super({
      orgId: params.orgId,
      role: params.role,
      systemRole: params.systemRole,
    });
    this.apiKeyId = params.apiKeyId;
    this.label = params.label;
  }
}
