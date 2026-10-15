import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OwnershipLookup } from 'src/domain/ownership/application/models/ownership-lookup';
import { UnexpectedOwnershipError } from 'src/domain/ownership/application/ownership.errors';
import { DescribeCollectiveOwnersQuery } from 'src/domain/ownership/application/use-cases/describe-collective-owners/describe-collective-owners.query';
import { DescribeCollectiveOwnersUseCase } from 'src/domain/ownership/application/use-cases/describe-collective-owners/describe-collective-owners.use-case';
import { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import { BuildOwnershipLookupQuery } from './build-ownership-lookup.query';

@Injectable()
export class BuildOwnershipLookupUseCase {
  constructor(
    private readonly getViewer: GetOwnershipViewerUseCase,
    private readonly describeOwners: DescribeCollectiveOwnersUseCase,
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
    return new OwnershipLookup(query.kind, viewer, descriptions);
  }
}
