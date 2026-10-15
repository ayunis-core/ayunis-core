import { Injectable } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedHandoverError } from 'src/domain/handovers/application/handovers.errors';
import { HandoverRequestsRepository } from 'src/domain/handovers/application/ports/handover-requests.repository';
import { HandoverPolicy } from 'src/domain/handovers/application/services/handover-policy.service';
import type { HandoverRequestView } from 'src/domain/handovers/domain/handover-request-view';
import { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import { ListReviewableHandoversQuery } from './list-reviewable-handovers.query';

@Injectable()
export class ListReviewableHandoversUseCase {
  constructor(
    private readonly repository: HandoverRequestsRepository,
    private readonly getViewer: GetOwnershipViewerUseCase,
    private readonly policy: HandoverPolicy,
  ) {}

  @HandleUnexpectedErrors(UnexpectedHandoverError)
  async execute(
    query: ListReviewableHandoversQuery,
  ): Promise<HandoverRequestView[]> {
    const viewer = await this.getViewer.execute();
    const pending = await this.repository.findPendingInOrg(
      viewer.orgId,
      query.kind,
    );
    return pending.filter(({ request }) =>
      this.policy.canReviewRequest(viewer, request),
    );
  }
}
