import { Injectable } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedHandoverError } from 'src/domain/handovers/application/handovers.errors';
import { HandoverRequestsRepository } from 'src/domain/handovers/application/ports/handover-requests.repository';
import { HandoverPolicy } from 'src/domain/handovers/application/services/handover-policy.service';
import { HandoverResourceType } from 'src/domain/handovers/domain/handover-resource-type.enum';
import { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';

export interface HandoverSummary {
  canReviewSkills: boolean;
  canReviewKnowledgeBases: boolean;
  openSkillRequests: number;
  openKnowledgeBaseRequests: number;
}

@Injectable()
export class GetHandoverSummaryUseCase {
  constructor(
    private readonly repository: HandoverRequestsRepository,
    private readonly getViewer: GetOwnershipViewerUseCase,
    private readonly policy: HandoverPolicy,
  ) {}

  @HandleUnexpectedErrors(UnexpectedHandoverError)
  async execute(): Promise<HandoverSummary> {
    const viewer = await this.getViewer.execute();
    const reviewable = (
      await this.repository.findPendingInOrg(viewer.orgId)
    ).filter(({ request }) => this.policy.canReviewRequest(viewer, request));
    const countOf = (kind: HandoverResourceType) =>
      reviewable.filter(({ request }) => request.resourceType === kind).length;
    return {
      canReviewSkills: this.policy.canReviewAny(
        viewer,
        HandoverResourceType.SKILL,
      ),
      canReviewKnowledgeBases: this.policy.canReviewAny(
        viewer,
        HandoverResourceType.KNOWLEDGE_BASE,
      ),
      openSkillRequests: countOf(HandoverResourceType.SKILL),
      openKnowledgeBaseRequests: countOf(HandoverResourceType.KNOWLEDGE_BASE),
    };
  }
}
