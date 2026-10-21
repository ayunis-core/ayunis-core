import { Injectable } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedHandoverError } from 'src/domain/handovers/application/handovers.errors';
import { HandoverRequestsRepository } from 'src/domain/handovers/application/ports/handover-requests.repository';
import { HandoverPolicy } from 'src/domain/handovers/application/services/handover-policy.service';
import type { HandoverRequestView } from 'src/domain/handovers/domain/handover-request-view';
import type { HandoverTarget } from 'src/domain/handovers/domain/handover-target';
import type { OwnerEditor } from 'src/domain/ownership/application/models/ownership-lookup';
import type { OwnershipViewer } from 'src/domain/ownership/application/models/ownership-viewer';
import { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import { GetTeamAdminPermissionsUseCase } from 'src/iam/permissions/application/use-cases/get-team-admin-permissions/get-team-admin-permissions.use-case';
import { TeamAdminPermission } from 'src/iam/permissions/domain/value-objects/team-admin-permission.enum';
import { DescribeTeamsQuery } from 'src/iam/teams/application/use-cases/describe-teams/describe-teams.query';
import { DescribeTeamsUseCase } from 'src/iam/teams/application/use-cases/describe-teams/describe-teams.use-case';
import { FindPendingHandoverQuery } from './find-pending-handover.query';

export interface PendingHandover {
  view: HandoverRequestView;
  viewerIsRequester: boolean;
  viewerCanReview: boolean;
  reviewers: OwnerEditor[];
}

@Injectable()
export class FindPendingHandoverUseCase {
  constructor(
    private readonly repository: HandoverRequestsRepository,
    private readonly getViewer: GetOwnershipViewerUseCase,
    private readonly policy: HandoverPolicy,
    private readonly describeTeams: DescribeTeamsUseCase,
    private readonly getTeamAdminPermissions: GetTeamAdminPermissionsUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedHandoverError)
  async execute(
    query: FindPendingHandoverQuery,
  ): Promise<PendingHandover | null> {
    const view = await this.repository.findPendingForResource(
      query.kind,
      query.resourceId,
    );
    if (!view) return null;
    const viewer = await this.getViewer.execute();
    const { request } = view;
    const viewerIsRequester = request.requestedByUserId === viewer.userId;
    const viewerCanReview = this.policy.canReviewRequest(viewer, request);
    if (!viewerIsRequester && !viewerCanReview) return null;
    return {
      view,
      viewerIsRequester,
      viewerCanReview,
      reviewers: await this.reviewersOf(request.target, viewer),
    };
  }

  private async reviewersOf(
    target: HandoverTarget,
    viewer: OwnershipViewer,
  ): Promise<OwnerEditor[]> {
    if (target.type !== 'team') return [];
    const [teams, teamAdminPermissions] = await Promise.all([
      this.describeTeams.execute(
        new DescribeTeamsQuery(viewer.orgId, [target.teamId]),
      ),
      this.getTeamAdminPermissions.execute(viewer.orgId),
    ]);
    if (
      !teamAdminPermissions.includes(TeamAdminPermission.TEAM_REVIEW_REQUESTS)
    ) {
      return [];
    }
    return teams.at(0)?.admins ?? [];
  }
}
