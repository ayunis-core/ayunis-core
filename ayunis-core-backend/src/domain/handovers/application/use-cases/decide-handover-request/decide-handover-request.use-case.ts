import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  HandoverNotAllowedError,
  HandoverNotPendingError,
  HandoverRequestNotFoundError,
  UnexpectedHandoverError,
} from 'src/domain/handovers/application/handovers.errors';
import { HandoverRequestsRepository } from 'src/domain/handovers/application/ports/handover-requests.repository';
import { HandoverPolicy } from 'src/domain/handovers/application/services/handover-policy.service';
import { HandoverResourceGateway } from 'src/domain/handovers/application/services/handover-resource.gateway';
import type { HandoverRequest } from 'src/domain/handovers/domain/handover-request.entity';
import type { HandoverRequestView } from 'src/domain/handovers/domain/handover-request-view';
import { HandoverStatus } from 'src/domain/handovers/domain/handover-status.enum';
import type { OwnershipViewer } from 'src/domain/ownership/application/models/ownership-viewer';
import { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import {
  DecideHandoverRequestCommand,
  type HandoverDecision,
} from './decide-handover-request.command';

const STATUS_BY_DECISION: Record<HandoverDecision, HandoverStatus> = {
  approve: HandoverStatus.APPROVED,
  reject: HandoverStatus.REJECTED,
  withdraw: HandoverStatus.WITHDRAWN,
};

@Injectable()
export class DecideHandoverRequestUseCase {
  private readonly logger = new Logger(DecideHandoverRequestUseCase.name);

  constructor(
    private readonly repository: HandoverRequestsRepository,
    private readonly getViewer: GetOwnershipViewerUseCase,
    private readonly policy: HandoverPolicy,
    private readonly resources: HandoverResourceGateway,
  ) {}

  @HandleUnexpectedErrors(UnexpectedHandoverError)
  @Transactional()
  async execute(
    command: DecideHandoverRequestCommand,
  ): Promise<HandoverRequestView> {
    this.logger.log(command, 'Deciding handover request');
    const viewer = await this.getViewer.execute();
    const view = await this.repository.findViewById(command.requestId);
    if (view?.request.orgId !== viewer.orgId) {
      throw new HandoverRequestNotFoundError(command.requestId);
    }
    const { request } = view;
    this.authorize(request, command.decision, viewer);
    if (!request.isPending) throw new HandoverNotPendingError(request.id);
    const status = STATUS_BY_DECISION[command.decision];
    const decided = await this.repository.decide(
      request.id,
      status,
      viewer.userId,
    );
    if (!decided) throw new HandoverNotPendingError(request.id);
    if (status === HandoverStatus.APPROVED) {
      await this.resources.transfer({
        kind: request.resourceType,
        resourceId: request.resourceId,
        requesterId: request.requestedByUserId,
        orgId: request.orgId,
        target: request.target,
      });
    }
    return { ...view, request: request.decided(status, viewer.userId) };
  }

  private authorize(
    request: HandoverRequest,
    decision: HandoverDecision,
    viewer: OwnershipViewer,
  ): void {
    if (decision === 'withdraw') {
      if (request.requestedByUserId !== viewer.userId) {
        throw new HandoverNotAllowedError('Only the requester can withdraw');
      }
      return;
    }
    if (!this.policy.canReviewRequest(viewer, request)) {
      throw new HandoverNotAllowedError('Not allowed to review this request');
    }
  }
}
