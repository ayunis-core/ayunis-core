import { FindTeamsByUserIdsAndOrgIdUseCase } from 'src/iam/teams/application/use-cases/find-teams-by-user-ids-and-org-id/find-teams-by-user-ids-and-org-id.use-case';
import type { UserWithTeams } from 'src/iam/users/domain/user-team-summary';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UserUnexpectedError } from 'src/iam/users/application/users.errors';
import { Injectable, Logger } from '@nestjs/common';
import { UsersRepository } from 'src/iam/users/application/ports/users.repository';
import { FindUsersByOrgIdQuery } from './find-users-by-org-id.query';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ContextService } from 'src/common/context/services/context.service';
import {
  getRequiredUserContext,
  isSuperAdmin,
} from 'src/common/context/required-context';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { HasPermissionQuery } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.query';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';

@Injectable()
export class FindUsersByOrgIdUseCase {
  private readonly logger = new Logger(FindUsersByOrgIdUseCase.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly contextService: ContextService,
    private readonly hasPermissionUseCase: HasPermissionUseCase,
    private readonly findTeamsByUsers: FindTeamsByUserIdsAndOrgIdUseCase,
  ) {}

  @HandleUnexpectedErrors(UserUnexpectedError)
  async execute(
    query: FindUsersByOrgIdQuery,
  ): Promise<Paginated<UserWithTeams>> {
    this.logger.log(
      {
        orgId: query.orgId,
        limit: query.limit,
        offset: query.offset,
        hasSearch: query.search !== undefined,
      },
      'findManyByOrgId',
    );
    const { role } = getRequiredUserContext(this.contextService);
    const callerIsSuperAdmin = isSuperAdmin(this.contextService);
    // Listing org users is allowed for super-admins, org admins (admins hold
    // every permission), and members who can assign users to teams — the
    // add-team-member picker needs the list.
    const canListUsers =
      callerIsSuperAdmin ||
      (await this.hasPermissionUseCase.execute(
        new HasPermissionQuery(
          query.orgId,
          role,
          Permission.ASSIGN_USERS_TO_TEAMS,
        ),
      ));
    if (!canListUsers) {
      throw new UnauthorizedAccessError({ orgId: query.orgId });
    }
    const users = await this.usersRepository.findManyByOrgId(
      query.orgId,
      {
        limit: query.limit,
        offset: query.offset,
      },
      {
        search: query.search,
      },
    );
    if (!query.includeTeams || (role !== UserRole.ADMIN && !callerIsSuperAdmin))
      return users;
    return this.includeTeams(users, query.orgId);
  }

  private async includeTeams(
    users: Paginated<UserWithTeams>,
    orgId: FindUsersByOrgIdQuery['orgId'],
  ): Promise<Paginated<UserWithTeams>> {
    const teams = await this.findTeamsByUsers.execute({
      userIds: users.data.map((user) => user.id),
      orgId,
    });
    return new Paginated({
      data: users.data.map((user) => ({
        ...user,
        teams: teams.get(user.id) ?? [],
      })),
      limit: users.limit,
      offset: users.offset,
      total: users.total,
    });
  }
}
