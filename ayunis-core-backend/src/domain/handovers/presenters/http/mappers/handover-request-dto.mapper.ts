import { Injectable } from '@nestjs/common';
import type { HandoverRequestView } from 'src/domain/handovers/domain/handover-request-view';
import type { HandoverTargets } from 'src/domain/handovers/application/use-cases/list-handover-targets/list-handover-targets.use-case';
import type { PendingHandover } from 'src/domain/handovers/application/use-cases/find-pending-handover/find-pending-handover.use-case';
import {
  type HandoverRequestDto,
  type HandoverTargetsResponseDto,
  HandoverTargetTypeDto,
  type PendingHandoverDto,
} from 'src/domain/handovers/presenters/http/dto/handover-request.dto';

@Injectable()
export class HandoverRequestDtoMapper {
  toDto(view: HandoverRequestView): HandoverRequestDto {
    const { request } = view;
    return {
      id: request.id,
      resourceType: request.resourceType,
      resource: { id: request.resourceId, name: view.resourceName },
      target:
        request.target.type === 'team'
          ? {
              type: HandoverTargetTypeDto.TEAM,
              teamId: request.target.teamId,
              teamName: view.targetTeamName ?? undefined,
            }
          : { type: HandoverTargetTypeDto.ORG },
      requestedBy: {
        userId: request.requestedByUserId,
        name: view.requesterName,
      },
      requestedAt: request.createdAt,
      status: request.status,
    };
  }

  toPendingDto(pending: PendingHandover): PendingHandoverDto {
    return {
      ...this.toDto(pending.view),
      viewerIsRequester: pending.viewerIsRequester,
      viewerCanReview: pending.viewerCanReview,
      reviewers: pending.reviewers,
    };
  }

  toTargetsDto(targets: HandoverTargets): HandoverTargetsResponseDto {
    return {
      targets: targets.targets.map((target) => ({
        ...target,
        type:
          target.type === 'team'
            ? HandoverTargetTypeDto.TEAM
            : HandoverTargetTypeDto.ORG,
      })),
      orgEditorsIncludeNonAdmins: targets.orgEditorsIncludeNonAdmins,
    };
  }
}
