import type { UUID } from 'crypto';
import type { Team } from '../../domain/team.entity';

export abstract class TeamsRepository {
  abstract findById(id: UUID): Promise<Team | null>;
  abstract findByOrgId(orgId: UUID): Promise<Team[]>;
  abstract findByUserId(userId: UUID): Promise<Team[]>;
  abstract findByNameAndOrgId(name: string, orgId: UUID): Promise<Team | null>;
  abstract create(team: Team): Promise<Team>;
  abstract update(team: Team): Promise<Team>;
  abstract delete(id: UUID): Promise<void>;
}
