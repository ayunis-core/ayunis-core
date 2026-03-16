import type { UUID } from 'crypto';

export abstract class TeamValidationPort {
  abstract existsInOrg(teamId: UUID, orgId: UUID): Promise<boolean>;
}
