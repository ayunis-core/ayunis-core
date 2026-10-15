import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OwnerNames } from 'src/domain/ownership/application/models/owner-names';
import { UnexpectedOwnershipError } from 'src/domain/ownership/application/ownership.errors';
import { DescribeTeamsQuery } from 'src/iam/teams/application/use-cases/describe-teams/describe-teams.query';
import { DescribeTeamsUseCase } from 'src/iam/teams/application/use-cases/describe-teams/describe-teams.use-case';
import { FindUsersByIdsQuery } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.query';
import { FindUsersByIdsUseCase } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.use-case';
import { NameOwnersQuery } from './name-owners.query';

@Injectable()
export class NameOwnersUseCase {
  constructor(
    private readonly context: ContextService,
    private readonly describeTeams: DescribeTeamsUseCase,
    private readonly findUsers: FindUsersByIdsUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedOwnershipError)
  async execute(query: NameOwnersQuery): Promise<OwnerNames> {
    const { orgId } = getRequiredUserContext(this.context);
    const userIds = new Set<UUID>();
    const teamIds = new Set<UUID>();
    for (const owner of query.owners) {
      if (owner.type === 'personal') userIds.add(owner.userId);
      if (owner.type === 'team') teamIds.add(owner.teamId);
    }
    for (const userId of query.userIds) if (userId) userIds.add(userId);
    const [users, teams] = await Promise.all([
      userIds.size > 0
        ? this.findUsers.execute(new FindUsersByIdsQuery([...userIds]))
        : [],
      this.describeTeams.execute(new DescribeTeamsQuery(orgId, [...teamIds])),
    ]);
    return new OwnerNames(
      new Map(users.map(({ id, name }) => [id, name])),
      new Map(teams.map(({ id, name }) => [id, name])),
    );
  }
}
