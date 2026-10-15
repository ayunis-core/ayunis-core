import { Injectable } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedHandoverError } from 'src/domain/handovers/application/handovers.errors';
import { HandoverRequestsRepository } from 'src/domain/handovers/application/ports/handover-requests.repository';
import { HandoverPolicy } from 'src/domain/handovers/application/services/handover-policy.service';
import { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import { IsHandoverReviewerQuery } from './is-handover-reviewer.query';

@Injectable()
export class IsHandoverReviewerUseCase {
  constructor(
    private readonly repository: HandoverRequestsRepository,
    private readonly getViewer: GetOwnershipViewerUseCase,
    private readonly policy: HandoverPolicy,
  ) {}

  @HandleUnexpectedErrors(UnexpectedHandoverError)
  async execute(query: IsHandoverReviewerQuery): Promise<boolean> {
    const view = await this.repository.findPendingForResource(
      query.kind,
      query.resourceId,
    );
    if (!view) return false;
    const viewer = await this.getViewer.execute();
    return this.policy.canReviewRequest(viewer, view.request);
  }
}
