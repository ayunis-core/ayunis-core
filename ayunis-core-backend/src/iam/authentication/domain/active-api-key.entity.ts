import type { UUID } from 'crypto';
import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

export class ActiveApiKey {
  readonly kind = 'apiKey' as const;
  readonly apiKeyId: UUID;
  readonly label: string;
  readonly orgId: UUID;
  readonly role: UserRole;
  readonly systemRole: SystemRole;

  constructor(params: {
    apiKeyId: UUID;
    label: string;
    orgId: UUID;
    role: UserRole;
    systemRole: SystemRole;
  }) {
    this.apiKeyId = params.apiKeyId;
    this.label = params.label;
    this.orgId = params.orgId;
    this.role = params.role;
    this.systemRole = params.systemRole;
  }
}
