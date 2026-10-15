import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { OwnerEditor } from 'src/domain/ownership/application/models/ownership-lookup';
import { OWNERSHIP_RIGHTS } from 'src/domain/ownership/application/models/owned-resource-kind';
import { UnexpectedOwnershipError } from 'src/domain/ownership/application/ownership.errors';
import { DescribeCollectiveOwnersQuery } from 'src/domain/ownership/application/use-cases/describe-collective-owners/describe-collective-owners.query';
import { DescribeCollectiveOwnersUseCase } from 'src/domain/ownership/application/use-cases/describe-collective-owners/describe-collective-owners.use-case';
import { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import { ListOwnerOptionsQuery } from './list-owner-options.query';

export type OwnerOption =
  | { type: 'personal' }
  | {
      type: 'team';
      teamId: UUID;
      teamName: string;
      memberCount: number;
      editors: OwnerEditor[];
    }
  | { type: 'org'; memberCount: number };

export interface OwnerOptions {
  options: OwnerOption[];
  orgEditorsIncludeNonAdmins: boolean;
}

@Injectable()
export class ListOwnerOptionsUseCase {
  constructor(
    private readonly getViewer: GetOwnershipViewerUseCase,
    private readonly describeOwners: DescribeCollectiveOwnersUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedOwnershipError)
  async execute(query: ListOwnerOptionsQuery): Promise<OwnerOptions> {
    const viewer = await this.getViewer.execute();
    const mayCreateForOrg = viewer.has(OWNERSHIP_RIGHTS[query.kind].org);
    const { teams, org } = await this.describeOwners.execute(
      new DescribeCollectiveOwnersQuery(
        query.kind,
        viewer.editableTeamIds(query.kind),
        mayCreateForOrg,
      ),
    );
    const teamOptions: OwnerOption[] = [...teams.values()]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((team) => ({
        type: 'team',
        teamId: team.teamId,
        teamName: team.name,
        memberCount: team.memberCount,
        editors: team.editors,
      }));
    return {
      options: [
        ...(viewer.canManageOwn(query.kind)
          ? [{ type: 'personal' as const }]
          : []),
        ...teamOptions,
        ...(org
          ? [{ type: 'org' as const, memberCount: org.memberCount }]
          : []),
      ],
      orgEditorsIncludeNonAdmins: org?.editorsIncludeNonAdmins ?? false,
    };
  }
}
