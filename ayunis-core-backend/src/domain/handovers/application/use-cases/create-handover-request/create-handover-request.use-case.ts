import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  HandoverAlreadyPendingError,
  HandoverNotAllowedError,
  HandoverRequestNotFoundError,
  HandoverTargetNotFoundError,
  UnexpectedHandoverError,
} from 'src/domain/handovers/application/handovers.errors';
import { HandoverRequestsRepository } from 'src/domain/handovers/application/ports/handover-requests.repository';
import { HandoverPolicy } from 'src/domain/handovers/application/services/handover-policy.service';
import { HandoverResourceGateway } from 'src/domain/handovers/application/services/handover-resource.gateway';
import { HandoverRequest } from 'src/domain/handovers/domain/handover-request.entity';
import type { HandoverRequestView } from 'src/domain/handovers/domain/handover-request-view';
import { HandoverStatus } from 'src/domain/handovers/domain/handover-status.enum';
import type { HandoverTarget } from 'src/domain/handovers/domain/handover-target';
import type { OwnershipViewer } from 'src/domain/ownership/application/models/ownership-viewer';
import { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import { FindTeamsByIdsAndOrgIdUseCase } from 'src/iam/teams/application/use-cases/find-teams-by-ids-and-org-id/find-teams-by-ids-and-org-id.use-case';
import { CreateHandoverRequestCommand } from './create-handover-request.command';

@Injectable()
export class CreateHandoverRequestUseCase {
  private readonly logger = new Logger(CreateHandoverRequestUseCase.name);

  constructor(
    private readonly repository: HandoverRequestsRepository,
    private readonly getViewer: GetOwnershipViewerUseCase,
    private readonly policy: HandoverPolicy,
    private readonly resources: HandoverResourceGateway,
    private readonly findTeams: FindTeamsByIdsAndOrgIdUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedHandoverError)
  @Transactional()
  async execute(
    command: CreateHandoverRequestCommand,
  ): Promise<HandoverRequestView> {
    this.logger.log(
      { kind: command.kind, target: command.target.type },
      'Creating handover request',
    );
    const viewer = await this.getViewer.execute();
    await this.resources.requireOwnItem(
      command.kind,
      command.resourceId,
      viewer.userId,
    );
    await this.requireTargetInOrg(command.target, viewer);
    const appliesImmediately = this.authorizeTarget(viewer, command);
    const pending = await this.repository.findPendingForResource(
      command.kind,
      command.resourceId,
    );
    if (pending) throw new HandoverAlreadyPendingError(command.resourceId);
    return this.store(command, viewer, appliesImmediately);
  }

  private authorizeTarget(
    viewer: OwnershipViewer,
    command: CreateHandoverRequestCommand,
  ): boolean {
    if (this.policy.canReview(viewer, command.kind, command.target)) {
      return true;
    }
    if (!this.policy.canRequest(viewer, command.kind, command.target)) {
      throw new HandoverNotAllowedError(
        'Not allowed to hand over to this target',
      );
    }
    return false;
  }

  private async store(
    command: CreateHandoverRequestCommand,
    viewer: OwnershipViewer,
    appliesImmediately: boolean,
  ): Promise<HandoverRequestView> {
    const request = new HandoverRequest({
      orgId: viewer.orgId,
      resourceType: command.kind,
      resourceId: command.resourceId,
      target: command.target,
      requestedByUserId: viewer.userId,
    });
    const saved = await this.repository.create(
      appliesImmediately
        ? request.decided(HandoverStatus.APPROVED, viewer.userId)
        : request,
    );
    const view = await this.repository.findViewById(saved.id);
    if (appliesImmediately) {
      await this.resources.transfer({
        kind: command.kind,
        resourceId: command.resourceId,
        requesterId: viewer.userId,
        orgId: viewer.orgId,
        target: command.target,
      });
    }
    if (!view) throw new HandoverRequestNotFoundError(saved.id);
    return view;
  }

  private async requireTargetInOrg(
    target: HandoverTarget,
    viewer: OwnershipViewer,
  ): Promise<void> {
    if (target.type !== 'team') return;
    const teams = await this.findTeams.execute({
      teamIds: [target.teamId],
      orgId: viewer.orgId,
    });
    if (teams.length === 0)
      throw new HandoverTargetNotFoundError(target.teamId);
  }
}
