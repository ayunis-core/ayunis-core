import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OwnershipLookup } from 'src/domain/ownership/application/models/ownership-lookup';
import { UnexpectedOwnershipError } from 'src/domain/ownership/application/ownership.errors';
import { DescribeCollectiveOwnersQuery } from 'src/domain/ownership/application/use-cases/describe-collective-owners/describe-collective-owners.query';
import { DescribeCollectiveOwnersUseCase } from 'src/domain/ownership/application/use-cases/describe-collective-owners/describe-collective-owners.use-case';
import { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import { FindUsersByIdsQuery } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.query';
import { FindUsersByIdsUseCase } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.use-case';
import { BuildOwnershipLookupQuery } from './build-ownership-lookup.query';

@Injectable()
export class BuildOwnershipLookupUseCase {
  constructor(
    private readonly getViewer: GetOwnershipViewerUseCase,
    private readonly describeOwners: DescribeCollectiveOwnersUseCase,
    private readonly findUsers: FindUsersByIdsUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedOwnershipError)
  async execute(query: BuildOwnershipLookupQuery): Promise<OwnershipLookup> {
    const viewer = query.viewer ?? (await this.getViewer.execute());
    const teamIds = new Set<UUID>();
    let includeOrg = false;
    for (const owner of query.owners) {
      if (owner.type === 'team') teamIds.add(owner.teamId);
      else includeOrg = true;
    }
    const descriptions =
      teamIds.size > 0 || includeOrg
        ? await this.describeOwners.execute(
            new DescribeCollectiveOwnersQuery(
              query.kind,
              [...teamIds],
              includeOrg,
            ),
          )
        : { teams: new Map(), org: null };
    const submitterNames = await this.findSubmitterNames(query.submitterIds);
    return new OwnershipLookup(
      query.kind,
      viewer,
      descriptions,
      submitterNames,
    );
  }

  private async findSubmitterNames(ids: UUID[]): Promise<Map<UUID, string>> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) return new Map();
    const users = await this.findUsers.execute(
      new FindUsersByIdsQuery(uniqueIds),
    );
    return new Map(users.map((user) => [user.id, user.name]));
  }
}
