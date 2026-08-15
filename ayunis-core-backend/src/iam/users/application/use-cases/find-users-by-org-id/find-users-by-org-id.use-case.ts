import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UsersRepository } from '../../ports/users.repository';
import { FindUsersByOrgIdQuery } from './find-users-by-org-id.query';
import { User } from 'src/iam/users/domain/user.entity';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ContextService } from 'src/common/context/services/context.service';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { HasPermissionQuery } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.query';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';

@Injectable()
export class FindUsersByOrgIdUseCase {
  constructor(
    @InjectPinoLogger(FindUsersByOrgIdUseCase.name)
    private readonly logger: PinoLogger,
    private readonly usersRepository: UsersRepository,
    private readonly contextService: ContextService,
    private readonly hasPermissionUseCase: HasPermissionUseCase,
  ) {}

  async execute(query: FindUsersByOrgIdQuery): Promise<Paginated<User>> {
    this.logger.info(
      {
        orgId: query.orgId,
        limit: query.limit,
        offset: query.offset,
        hasSearch: query.search !== undefined,
      },
      'findManyByOrgId',
    );
    const systemRole = this.contextService.get('systemRole');
    const orgRole = this.contextService.get('role');
    // Listing org users is allowed for super-admins, org admins (admins hold
    // every permission), and members who can assign users to teams — the
    // add-team-member picker needs the list.
    const canListUsers =
      systemRole === SystemRole.SUPER_ADMIN ||
      (orgRole !== undefined &&
        (await this.hasPermissionUseCase.execute(
          new HasPermissionQuery(
            query.orgId,
            orgRole,
            Permission.ASSIGN_USERS_TO_TEAMS,
          ),
        )));
    if (!canListUsers) {
      throw new UnauthorizedAccessError({ orgId: query.orgId });
    }
    return this.usersRepository.findManyByOrgId(
      query.orgId,
      {
        limit: query.limit,
        offset: query.offset,
      },
      {
        search: query.search,
      },
    );
  }
}
