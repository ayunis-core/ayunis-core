import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { FindTeamsByUserIdQuery } from 'src/iam/teams/application/use-cases/find-teams-by-user-id/find-teams-by-user-id.query';
import { FindTeamsByUserIdUseCase } from 'src/iam/teams/application/use-cases/find-teams-by-user-id/find-teams-by-user-id.use-case';

export interface EffectiveModelScope {
  readonly orgId: UUID;
  readonly overrideTeamIds: UUID[];
}

@Injectable()
export class EffectiveModelScopeResolverService {
  constructor(
    private readonly findTeamsByUserIdUseCase: FindTeamsByUserIdUseCase,
  ) {}

  async resolve(orgId: UUID, userId?: UUID): Promise<EffectiveModelScope> {
    if (!userId) return { orgId, overrideTeamIds: [] };

    const teams = await this.findTeamsByUserIdUseCase.execute(
      new FindTeamsByUserIdQuery(userId),
    );
    const overrideTeamIds = teams
      .filter((team) => team.orgId === orgId && team.modelOverrideEnabled)
      .map((team) => team.id);

    return { orgId, overrideTeamIds: [...new Set(overrideTeamIds)] };
  }
}
