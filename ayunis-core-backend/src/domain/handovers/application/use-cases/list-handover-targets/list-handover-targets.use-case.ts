import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedHandoverError } from 'src/domain/handovers/application/handovers.errors';
import { toOwnedKind } from 'src/domain/handovers/application/owned-kind';
import { HandoverPolicy } from 'src/domain/handovers/application/services/handover-policy.service';
import type { HandoverResourceType } from 'src/domain/handovers/domain/handover-resource-type.enum';
import type { OwnerEditor } from 'src/domain/ownership/application/models/ownership-lookup';
import type { OwnershipViewer } from 'src/domain/ownership/application/models/ownership-viewer';
import { DescribeCollectiveOwnersQuery } from 'src/domain/ownership/application/use-cases/describe-collective-owners/describe-collective-owners.query';
import { DescribeCollectiveOwnersUseCase } from 'src/domain/ownership/application/use-cases/describe-collective-owners/describe-collective-owners.use-case';
import { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import { GetTeamAdminPermissionsUseCase } from 'src/iam/permissions/application/use-cases/get-team-admin-permissions/get-team-admin-permissions.use-case';
import { TeamAdminPermission } from 'src/iam/permissions/domain/value-objects/team-admin-permission.enum';
import { DescribeTeamsQuery } from 'src/iam/teams/application/use-cases/describe-teams/describe-teams.query';
import {
  DescribeTeamsUseCase,
  type TeamDescription,
} from 'src/iam/teams/application/use-cases/describe-teams/describe-teams.use-case';
import { FindTeamsByOrgIdQuery } from 'src/iam/teams/application/use-cases/find-teams-by-org-id/find-teams-by-org-id.query';
import { FindTeamsByOrgIdUseCase } from 'src/iam/teams/application/use-cases/find-teams-by-org-id/find-teams-by-org-id.use-case';
import { ListHandoverTargetsQuery } from './list-handover-targets.query';

export interface HandoverTargetOption {
  type: 'team' | 'org';
  teamId?: UUID;
  teamName?: string;
  isOwnTeam: boolean;
  memberCount: number;
  appliesImmediately: boolean;
  reviewers: OwnerEditor[];
}

export interface HandoverTargets {
  targets: HandoverTargetOption[];
  orgEditorsIncludeNonAdmins: boolean;
}

@Injectable()
export class ListHandoverTargetsUseCase {
  constructor(
    private readonly getViewer: GetOwnershipViewerUseCase,
    private readonly policy: HandoverPolicy,
    private readonly findTeams: FindTeamsByOrgIdUseCase,
    private readonly describeTeams: DescribeTeamsUseCase,
    private readonly getTeamAdminPermissions: GetTeamAdminPermissionsUseCase,
    private readonly describeOwners: DescribeCollectiveOwnersUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedHandoverError)
  async execute(query: ListHandoverTargetsQuery): Promise<HandoverTargets> {
    const viewer = await this.getViewer.execute();
    const [teamTargets, org] = await Promise.all([
      this.teamTargets(viewer, query.kind),
      this.orgTarget(viewer, query.kind),
    ]);
    return {
      targets: org ? [...teamTargets, org.target] : teamTargets,
      orgEditorsIncludeNonAdmins: org?.editorsIncludeNonAdmins ?? false,
    };
  }

  private async teamTargets(
    viewer: OwnershipViewer,
    kind: HandoverResourceType,
  ): Promise<HandoverTargetOption[]> {
    const teams = await this.findTeams.execute(
      new FindTeamsByOrgIdQuery(viewer.orgId),
    );
    const offered = teams.filter(({ id }) => {
      const target = { type: 'team' as const, teamId: id };
      return (
        this.policy.canRequest(viewer, kind, target) ||
        this.policy.canReview(viewer, kind, target)
      );
    });
    if (offered.length === 0) return [];
    const [descriptions, teamAdminPermissions] = await Promise.all([
      this.describeTeams.execute(
        new DescribeTeamsQuery(
          viewer.orgId,
          offered.map(({ id }) => id),
        ),
      ),
      this.getTeamAdminPermissions.execute(viewer.orgId),
    ]);
    const adminsReview = teamAdminPermissions.includes(
      TeamAdminPermission.TEAM_REVIEW_REQUESTS,
    );
    return descriptions
      .map((team) => this.toTeamTarget(viewer, kind, team, adminsReview))
      .sort(byOwnTeamThenName);
  }

  private toTeamTarget(
    viewer: OwnershipViewer,
    kind: HandoverResourceType,
    team: TeamDescription,
    adminsReview: boolean,
  ): HandoverTargetOption {
    return {
      type: 'team',
      teamId: team.id,
      teamName: team.name,
      isOwnTeam: viewer.isMemberOf(team.id),
      memberCount: team.memberCount,
      appliesImmediately: this.policy.canReview(viewer, kind, {
        type: 'team',
        teamId: team.id,
      }),
      reviewers: adminsReview ? team.admins : [],
    };
  }

  private async orgTarget(
    viewer: OwnershipViewer,
    kind: HandoverResourceType,
  ): Promise<{
    target: HandoverTargetOption;
    editorsIncludeNonAdmins: boolean;
  } | null> {
    const target = { type: 'org' as const };
    const appliesImmediately = this.policy.canReview(viewer, kind, target);
    if (!appliesImmediately && !this.policy.canRequest(viewer, kind, target)) {
      return null;
    }
    const { org } = await this.describeOwners.execute(
      new DescribeCollectiveOwnersQuery(toOwnedKind(kind), [], true),
    );
    return {
      target: {
        type: 'org',
        isOwnTeam: false,
        memberCount: org?.memberCount ?? 0,
        appliesImmediately,
        reviewers: [],
      },
      editorsIncludeNonAdmins: org?.editorsIncludeNonAdmins ?? false,
    };
  }
}

function byOwnTeamThenName(
  left: HandoverTargetOption,
  right: HandoverTargetOption,
): number {
  if (left.isOwnTeam !== right.isOwnTeam) return left.isOwnTeam ? -1 : 1;
  return (left.teamName ?? '').localeCompare(right.teamName ?? '');
}
