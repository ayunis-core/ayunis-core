jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: unknown, _propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { randomUUID } from 'crypto';
import {
  HandoverAlreadyPendingError,
  HandoverNotAllowedError,
} from 'src/domain/handovers/application/handovers.errors';
import type { HandoverRequestsRepository } from 'src/domain/handovers/application/ports/handover-requests.repository';
import { HandoverPolicy } from 'src/domain/handovers/application/services/handover-policy.service';
import type { HandoverResourceGateway } from 'src/domain/handovers/application/services/handover-resource.gateway';
import type { HandoverRequest } from 'src/domain/handovers/domain/handover-request.entity';
import { HandoverResourceType } from 'src/domain/handovers/domain/handover-resource-type.enum';
import { HandoverStatus } from 'src/domain/handovers/domain/handover-status.enum';
import type { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import { anOwnershipViewer } from 'src/domain/ownership/application/testing/ownership.fixtures';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import type { FindTeamsByIdsAndOrgIdUseCase } from 'src/iam/teams/application/use-cases/find-teams-by-ids-and-org-id/find-teams-by-ids-and-org-id.use-case';
import { CreateHandoverRequestCommand } from './create-handover-request.command';
import { CreateHandoverRequestUseCase } from './create-handover-request.use-case';

const orgId = randomUUID();
const userId = randomUUID();
const skillId = randomUUID();

function setup(viewerParams = {}) {
  let saved: HandoverRequest | undefined;
  const repository = {
    lockResource: jest.fn().mockResolvedValue(undefined),
    findPendingForResource: jest.fn().mockResolvedValue(null),
    create: jest.fn((request: HandoverRequest) => {
      saved = request;
      return Promise.resolve(request);
    }),
    findViewById: jest.fn(() =>
      Promise.resolve({
        request: saved,
        resourceName: 'Besprechungsprotokoll',
        requesterName: 'Lena Hoffmann',
        targetTeamName: null,
      }),
    ),
  };
  const resources = { requireOwnItem: jest.fn(), transfer: jest.fn() };
  const viewer = anOwnershipViewer({
    userId,
    orgId,
    permissions: [Permission.REQUEST_SKILL_TRANSFER_ORG],
    ...viewerParams,
  });
  const useCase = new CreateHandoverRequestUseCase(
    repository as unknown as HandoverRequestsRepository,
    {
      execute: jest.fn().mockResolvedValue(viewer),
    } as unknown as GetOwnershipViewerUseCase,
    new HandoverPolicy(),
    resources as unknown as HandoverResourceGateway,
    {
      execute: jest.fn().mockResolvedValue([{ id: 'team' }]),
    } as unknown as FindTeamsByIdsAndOrgIdUseCase,
  );
  return { useCase, repository, resources };
}

const toOrg = new CreateHandoverRequestCommand(
  HandoverResourceType.SKILL,
  skillId,
  { type: 'org' },
);

describe(CreateHandoverRequestUseCase.name, () => {
  it('creates a pending request when someone else has to review', async () => {
    const { useCase, resources } = setup();

    const view = await useCase.execute(toOrg);

    expect(view.request.status).toBe(HandoverStatus.PENDING);
    expect(resources.transfer).not.toHaveBeenCalled();
  });

  it('hands over immediately when the requester may review the target', async () => {
    const { useCase, resources } = setup({ isAdmin: true });

    const view = await useCase.execute(toOrg);

    expect(view.request.status).toBe(HandoverStatus.APPROVED);
    expect(resources.transfer).toHaveBeenCalledWith(
      expect.objectContaining({ resourceId: skillId, requesterId: userId }),
    );
  });

  it('refuses a target without the request or review right', async () => {
    const { useCase, repository } = setup({ permissions: [] });

    await expect(useCase.execute(toOrg)).rejects.toBeInstanceOf(
      HandoverNotAllowedError,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it.each([
    ['a pending request', {}],
    ['an immediate handover', { isAdmin: true }],
  ])(
    'locks the item before checking ownership and open requests for %s',
    async (_case, viewerParams) => {
      const { useCase, repository, resources } = setup(viewerParams);

      await useCase.execute(toOrg);

      expect(repository.lockResource).toHaveBeenCalledWith(
        HandoverResourceType.SKILL,
        skillId,
      );
      const lockedAt = repository.lockResource.mock.invocationCallOrder[0];
      expect(lockedAt).toBeLessThan(
        resources.requireOwnItem.mock.invocationCallOrder[0],
      );
      expect(lockedAt).toBeLessThan(
        repository.findPendingForResource.mock.invocationCallOrder[0],
      );
    },
  );

  it('allows only one open request per item', async () => {
    const { useCase, repository } = setup();
    repository.findPendingForResource.mockResolvedValue({});

    await expect(useCase.execute(toOrg)).rejects.toBeInstanceOf(
      HandoverAlreadyPendingError,
    );
  });
});
