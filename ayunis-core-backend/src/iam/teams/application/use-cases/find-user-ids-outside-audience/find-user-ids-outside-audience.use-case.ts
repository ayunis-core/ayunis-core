import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { TeamMembersRepository } from 'src/iam/teams/application/ports/team-members.repository';
import { UnexpectedTeamMemberError } from 'src/iam/teams/application/team-members.errors';
import { FindAllUserIdsByOrgIdQuery } from 'src/iam/users/application/use-cases/find-all-user-ids-by-org-id/find-all-user-ids-by-org-id.query';
import { FindAllUserIdsByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-all-user-ids-by-org-id/find-all-user-ids-by-org-id.use-case';
import {
  FindUserIdsOutsideAudienceQuery,
  type ResourceAudience,
} from './find-user-ids-outside-audience.query';

/**
 * The organization's users who cannot reach a resource owned by the audience,
 * e.g. to clean up their state after the resource moved to a narrower owner.
 */
@Injectable()
export class FindUserIdsOutsideAudienceUseCase {
  private readonly logger = new Logger(FindUserIdsOutsideAudienceUseCase.name);

  constructor(
    private readonly teamMembersRepository: TeamMembersRepository,
    private readonly findOrgUserIds: FindAllUserIdsByOrgIdUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedTeamMemberError)
  async execute(query: FindUserIdsOutsideAudienceQuery): Promise<UUID[]> {
    this.logger.log(
      { orgId: query.orgId, audienceType: query.audience.type },
      'Finding user IDs outside audience',
    );
    if (query.audience.type === 'org') return [];
    const [orgUserIds, audienceUserIds] = await Promise.all([
      this.findOrgUserIds.execute(new FindAllUserIdsByOrgIdQuery(query.orgId)),
      this.findAudienceUserIds(query.audience),
    ]);
    const audience = new Set(audienceUserIds);
    return orgUserIds.filter((userId) => !audience.has(userId));
  }

  private async findAudienceUserIds(
    audience: Exclude<ResourceAudience, { type: 'org' }>,
  ): Promise<UUID[]> {
    if (audience.type === 'user') return [audience.userId];
    return this.teamMembersRepository.findAllUserIdsByTeamId(audience.teamId);
  }
}
