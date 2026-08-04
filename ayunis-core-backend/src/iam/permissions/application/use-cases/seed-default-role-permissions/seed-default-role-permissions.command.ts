import type { UUID } from 'crypto';

export class SeedDefaultRolePermissionsCommand {
  constructor(public readonly orgId: UUID) {}
}
