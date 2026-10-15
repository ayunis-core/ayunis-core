jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: unknown, _propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { randomUUID } from 'crypto';
import {
  HandoverNotAllowedError,
  HandoverNotPendingError,
  HandoverRequestNotFoundError,
} from 'src/domain/handovers/application/handovers.errors';
import type { HandoverRequestsRepository } from 'src/domain/handovers/application/ports/handover-requests.repository';
import { HandoverPolicy } from 'src/domain/handovers/application/services/handover-policy.service';
import type { HandoverResourceGateway } from 'src/domain/handovers/application/services/handover-resource.gateway';
import { HandoverRequest } from 'src/domain/handovers/domain/handover-request.entity';
import { HandoverResourceType } from 'src/domain/handovers/domain/handover-resource-type.enum';
import { HandoverStatus } from 'src/domain/handovers/domain/handover-status.enum';
import type { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import { anOwnershipViewer } from 'src/domain/ownership/application/testing/ownership.fixtures';
import { TeamAdminPermission } from 'src/iam/permissions/domain/value-objects/team-admin-permission.enum';
import { DecideHandoverRequestCommand } from './decide-handover-request.command';
import { DecideHandoverRequestUseCase } from './decide-handover-request.use-case';

const orgId = randomUUID();
const teamId = randomUUID();
const requesterId = randomUUID();
const reviewerId = randomUUID();

function setup(viewerParams = {}) {
  const request = new HandoverRequest({
    orgId,
    resourceType: HandoverResourceType.SKILL,
    resourceId: randomUUID(),
    target: { type: 'team', teamId },
    requestedByUserId: requesterId,
  });
  const repository = {
    findViewById: jest.fn().mockResolvedValue({
      request,
      resourceName: 'E-Mail-Antworten formulieren',
      requesterName: 'Lena Hoffmann',
      targetTeamName: 'Bauamt',
    }),
    decide: jest.fn().mockResolvedValue(true),
  };
  const resources = { transfer: jest.fn() };
  const viewer = anOwnershipViewer({
    userId: reviewerId,
    orgId,
    adminTeamIds: [teamId],
    teamAdminPermissions: [TeamAdminPermission.TEAM_REVIEW_REQUESTS],
    ...viewerParams,
  });
  const useCase = new DecideHandoverRequestUseCase(
    repository as unknown as HandoverRequestsRepository,
    {
      execute: jest.fn().mockResolvedValue(viewer),
    } as unknown as GetOwnershipViewerUseCase,
    new HandoverPolicy(),
    resources as unknown as HandoverResourceGateway,
  );
  return { useCase, repository, resources, request };
}

describe(DecideHandoverRequestUseCase.name, () => {
  it('approves and hands the item over to the target', async () => {
    const { useCase, repository, resources, request } = setup();

    const result = await useCase.execute(
      new DecideHandoverRequestCommand(request.id, 'approve'),
    );

    expect(repository.decide).toHaveBeenCalledWith(
      request.id,
      HandoverStatus.APPROVED,
      reviewerId,
    );
    expect(resources.transfer).toHaveBeenCalledWith({
      kind: HandoverResourceType.SKILL,
      resourceId: request.resourceId,
      requesterId,
      orgId,
      target: { type: 'team', teamId },
    });
    expect(result.request.status).toBe(HandoverStatus.APPROVED);
  });

  it('rejects without changing the owner', async () => {
    const { useCase, resources, request } = setup();

    await useCase.execute(
      new DecideHandoverRequestCommand(request.id, 'reject'),
    );

    expect(resources.transfer).not.toHaveBeenCalled();
  });

  it('refuses reviewers without the review right', async () => {
    const { useCase, request, repository } = setup({
      teamAdminPermissions: [],
    });

    await expect(
      useCase.execute(new DecideHandoverRequestCommand(request.id, 'approve')),
    ).rejects.toBeInstanceOf(HandoverNotAllowedError);
    expect(repository.decide).not.toHaveBeenCalled();
  });

  it('lets only the requester withdraw', async () => {
    const { useCase, request } = setup();

    await expect(
      useCase.execute(new DecideHandoverRequestCommand(request.id, 'withdraw')),
    ).rejects.toBeInstanceOf(HandoverNotAllowedError);
  });

  it('reports a conflict when another reviewer decided first', async () => {
    const { useCase, request, repository, resources } = setup();
    repository.decide.mockResolvedValue(false);

    await expect(
      useCase.execute(new DecideHandoverRequestCommand(request.id, 'approve')),
    ).rejects.toBeInstanceOf(HandoverNotPendingError);
    expect(resources.transfer).not.toHaveBeenCalled();
  });

  it('hides requests of another organisation', async () => {
    const { useCase, request } = setup({ orgId: randomUUID(), isAdmin: true });

    await expect(
      useCase.execute(new DecideHandoverRequestCommand(request.id, 'approve')),
    ).rejects.toBeInstanceOf(HandoverRequestNotFoundError);
  });
});
