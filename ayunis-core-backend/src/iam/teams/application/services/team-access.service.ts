import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import { TeamAccess } from 'src/iam/teams/application/models/team-access.model';
import { GetMyPermissionsUseCase } from 'src/iam/permissions/application/use-cases/get-my-permissions/get-my-permissions.use-case';
import { GetMyPermissionsQuery } from 'src/iam/permissions/application/use-cases/get-my-permissions/get-my-permissions.query';
import type { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export interface TeamPrincipal {
  userId: UUID;
  orgId: UUID;
  role: UserRole;
}

export interface MembershipAccess {
  orgAccess: TeamAccess;
  byTeamId: Map<UUID, TeamAccess>;
}

/**
 * Takes the principal explicitly instead of reading ContextService: the team
 * permissions guard runs before the interceptor that populates the context.
 */
@Injectable()
export class TeamAccessService {
  constructor(
    private readonly teamMembersRepository: TeamMembersRepository,
    private readonly getMyPermissionsUseCase: GetMyPermissionsUseCase,
  ) {}

  async forTeam(principal: TeamPrincipal, teamId: UUID): Promise<TeamAccess> {
    const membership = await this.teamMembersRepository.findByTeamIdAndUserId(
      teamId,
      principal.userId,
    );
    const permissionsOf = this.rolePermissionsLoader(principal.orgId);
    return this.toAccess(principal, membership?.role ?? null, permissionsOf);
  }

  async forMemberships(principal: TeamPrincipal): Promise<MembershipAccess> {
    const memberships = await this.teamMembersRepository.findByUserId(
      principal.userId,
    );
    const permissionsOf = this.rolePermissionsLoader(principal.orgId);
    const [orgAccess, ...teamAccesses] = await Promise.all([
      this.toAccess(principal, null, permissionsOf),
      ...memberships.map((membership) =>
        this.toAccess(principal, membership.role, permissionsOf),
      ),
    ]);
    return {
      orgAccess,
      byTeamId: new Map(
        memberships.map((membership, index) => [
          membership.teamId,
          teamAccesses[index],
        ]),
      ),
    };
  }

  private async toAccess(
    principal: TeamPrincipal,
    teamRole: UserRole | null,
    permissionsOf: (role: UserRole) => Promise<Permission[]>,
  ): Promise<TeamAccess> {
    const [orgPermissions, teamPermissions] = await Promise.all([
      permissionsOf(principal.role),
      teamRole ? permissionsOf(teamRole) : [],
    ]);
    return new TeamAccess({ teamRole, orgPermissions, teamPermissions });
  }

  private rolePermissionsLoader(
    orgId: UUID,
  ): (role: UserRole) => Promise<Permission[]> {
    const cache = new Map<UserRole, Promise<Permission[]>>();
    return (role) => {
      let permissions = cache.get(role);
      if (!permissions) {
        permissions = this.getMyPermissionsUseCase.execute(
          new GetMyPermissionsQuery(orgId, role),
        );
        cache.set(role, permissions);
      }
      return permissions;
    };
  }
}
