import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { isUUID } from 'class-validator';
import type { UUID } from 'crypto';
import type { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import type { ApiKeyPrincipal } from 'src/iam/authentication/application/strategies/api-key.strategy';
import { buildAccessDeniedAuditContext } from 'src/common/util/access-denied-audit.util';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { REQUIRE_TEAM_PERMISSION_KEY } from 'src/iam/teams/application/decorators/team-permissions.decorator';
import { GetTeamAccessUseCase } from 'src/iam/teams/application/use-cases/get-team-access/get-team-access.use-case';
import { GetTeamAccessQuery } from 'src/iam/teams/application/use-cases/get-team-access/get-team-access.query';

@Injectable()
export class TeamPermissionsGuard implements CanActivate {
  private readonly logger = new Logger(TeamPermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly getTeamAccessUseCase: GetTeamAccessUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<
      Permission[] | undefined
    >(REQUIRE_TEAM_PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as ActiveUser | ApiKeyPrincipal | undefined;
    const teamId = request.params.id;

    // API-key principals carry no user id or role; an undefined id must never
    // reach the membership lookup, where TypeORM would drop it from the filter.
    if (!user || !('id' in user) || !isUUID(teamId)) {
      this.logger.warn(
        {
          ...buildAccessDeniedAuditContext(request, user),
          requiredPermissions,
        },
        'Access denied: no principal or team for team permission check',
      );
      return false;
    }

    const access = await this.getTeamAccessUseCase.execute(
      new GetTeamAccessQuery(
        { userId: user.id, orgId: user.orgId, role: user.role },
        teamId as UUID,
      ),
    );
    const allowed = access.canAny(...requiredPermissions);

    if (!allowed) {
      this.logger.warn(
        {
          ...buildAccessDeniedAuditContext(request, user),
          userRole: user.role,
          teamId,
          teamRole: access.teamRole,
          requiredPermissions,
        },
        'Access denied: missing team permission',
      );
    }

    return allowed;
  }
}
