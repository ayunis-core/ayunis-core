import { Injectable } from '@nestjs/common';
import type { OwnershipViewer } from 'src/domain/ownership/application/models/ownership-viewer';
import { HandoverResourceType } from 'src/domain/handovers/domain/handover-resource-type.enum';
import type { HandoverTarget } from 'src/domain/handovers/domain/handover-target';
import type { HandoverRequest } from 'src/domain/handovers/domain/handover-request.entity';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { TeamAdminPermission } from 'src/iam/permissions/domain/value-objects/team-admin-permission.enum';

interface HandoverRights {
  ownTeams: Permission;
  otherTeams: Permission;
  org: Permission;
  reviewAll: Permission;
}

const HANDOVER_RIGHTS: Record<HandoverResourceType, HandoverRights> = {
  [HandoverResourceType.SKILL]: {
    ownTeams: Permission.REQUEST_SKILL_TRANSFER,
    otherTeams: Permission.REQUEST_SKILL_TRANSFER_OTHER_TEAMS,
    org: Permission.REQUEST_SKILL_TRANSFER_ORG,
    reviewAll: Permission.REVIEW_ALL_SKILL_REQUESTS,
  },
  [HandoverResourceType.KNOWLEDGE_BASE]: {
    ownTeams: Permission.REQUEST_KNOWLEDGE_TRANSFER,
    otherTeams: Permission.REQUEST_KNOWLEDGE_TRANSFER_OTHER_TEAMS,
    org: Permission.REQUEST_KNOWLEDGE_TRANSFER_ORG,
    reviewAll: Permission.REVIEW_ALL_KNOWLEDGE_REQUESTS,
  },
};

@Injectable()
export class HandoverPolicy {
  canReview(
    viewer: OwnershipViewer,
    kind: HandoverResourceType,
    target: HandoverTarget,
  ): boolean {
    if (viewer.isAdmin || viewer.has(HANDOVER_RIGHTS[kind].reviewAll)) {
      return true;
    }
    return (
      target.type === 'team' &&
      viewer.hasTeamAdminRight(
        target.teamId,
        TeamAdminPermission.TEAM_REVIEW_REQUESTS,
      )
    );
  }

  canReviewRequest(viewer: OwnershipViewer, request: HandoverRequest): boolean {
    return (
      request.orgId === viewer.orgId &&
      this.canReview(viewer, request.resourceType, request.target)
    );
  }

  canReviewAny(viewer: OwnershipViewer, kind: HandoverResourceType): boolean {
    return (
      viewer.isAdmin ||
      viewer.has(HANDOVER_RIGHTS[kind].reviewAll) ||
      viewer.hasTeamAdminRightAnywhere(TeamAdminPermission.TEAM_REVIEW_REQUESTS)
    );
  }

  canRequest(
    viewer: OwnershipViewer,
    kind: HandoverResourceType,
    target: HandoverTarget,
  ): boolean {
    const rights = HANDOVER_RIGHTS[kind];
    if (target.type === 'org') return viewer.has(rights.org);
    return viewer.isMemberOf(target.teamId)
      ? viewer.has(rights.ownTeams)
      : viewer.has(rights.otherTeams);
  }
}
