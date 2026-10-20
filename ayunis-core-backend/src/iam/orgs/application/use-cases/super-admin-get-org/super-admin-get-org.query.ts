import type { UUID } from 'crypto';

export class SuperAdminGetOrgQuery {
  constructor(public readonly id: UUID) {}
}
