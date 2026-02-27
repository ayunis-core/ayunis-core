import { Injectable, Logger } from '@nestjs/common';
import { UUID } from 'crypto';
import { ShareScopeType } from '../../domain/value-objects/share-scope-type.enum';
import { RemainingShareScope } from '../events/share-deleted.event';
import { FindAllUserIdsByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-all-user-ids-by-org-id/find-all-user-ids-by-org-id.use-case';
import { FindAllUserIdsByOrgIdQuery } from 'src/iam/users/application/use-cases/find-all-user-ids-by-org-id/find-all-user-ids-by-org-id.query';
import { FindAllUserIdsByTeamIdUseCase } from 'src/iam/teams/application/use-cases/find-all-user-ids-by-team-id/find-all-user-ids-by-team-id.use-case';
import { FindAllUserIdsByTeamIdQuery } from 'src/iam/teams/application/use-cases/find-all-user-ids-by-team-id/find-all-user-ids-by-team-id.query';

@Injectable()
export class ShareScopeResolverService {
  private readonly logger = new Logger(ShareScopeResolverService.name);

  constructor(
    private readonly findAllUserIdsByOrgId: FindAllUserIdsByOrgIdUseCase,
    private readonly findAllUserIdsByTeamId: FindAllUserIdsByTeamIdUseCase,
  ) {}

  async resolveUserIds(scopes: RemainingShareScope[]): Promise<Set<UUID>> {
    const userIds = new Set<UUID>();

    for (const scope of scopes) {
      const ids = await this.resolveScopeUserIds(scope);
      for (const id of ids) {
        userIds.add(id);
      }
    }

    return userIds;
  }

  private async resolveScopeUserIds(
    scope: RemainingShareScope,
  ): Promise<UUID[]> {
    switch (scope.scopeType) {
      case ShareScopeType.ORG:
        return this.findAllUserIdsByOrgId.execute(
          new FindAllUserIdsByOrgIdQuery(scope.scopeId),
        );
      case ShareScopeType.TEAM:
        return this.findAllUserIdsByTeamId.execute(
          new FindAllUserIdsByTeamIdQuery(scope.scopeId),
        );
      default:
        this.logger.warn('Unknown scope type', {
          scopeType: scope.scopeType,
        });
        return [];
    }
  }
}
