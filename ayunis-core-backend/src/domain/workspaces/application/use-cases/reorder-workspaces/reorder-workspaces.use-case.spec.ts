import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import {
  aWorkspace,
  createMockContextService,
  createMockWorkspacesRepository,
  TEST_USER_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { ReorderWorkspacesCommand } from './reorder-workspaces.command';
import { ReorderWorkspacesUseCase } from './reorder-workspaces.use-case';

const FIRST_ID = '44444444-4444-4444-8444-444444444444' as UUID;
const SECOND_ID = '55555555-5555-4555-8555-555555555555' as UUID;
const FOREIGN_ID = '66666666-6666-4666-8666-666666666666' as UUID;

describe('ReorderWorkspacesUseCase', () => {
  let useCase: ReorderWorkspacesUseCase;
  let repository: jest.Mocked<WorkspacesRepository>;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  beforeEach(async () => {
    repository = createMockWorkspacesRepository();
    repository.findAllByUserId.mockResolvedValue([
      aWorkspace({ id: FIRST_ID }),
      aWorkspace({ id: SECOND_ID }),
    ]);
    const module = await Test.createTestingModule({
      providers: [
        ReorderWorkspacesUseCase,
        { provide: WorkspacesRepository, useValue: repository },
        { provide: ContextService, useValue: createMockContextService() },
      ],
    }).compile();
    useCase = module.get(ReorderWorkspacesUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('persists the order it was given', async () => {
    await useCase.execute(
      new ReorderWorkspacesCommand({ workspaceIds: [SECOND_ID, FIRST_ID] }),
    );

    expect(repository.updateSortOrders).toHaveBeenCalledWith(TEST_USER_ID, [
      SECOND_ID,
      FIRST_ID,
    ]);
  });

  it('renumbers the workspaces left out, so their order cannot collide', async () => {
    // The sidebar only ever reorders the pinned subset.
    await useCase.execute(
      new ReorderWorkspacesCommand({ workspaceIds: [SECOND_ID] }),
    );

    expect(repository.updateSortOrders).toHaveBeenCalledWith(TEST_USER_ID, [
      SECOND_ID,
      FIRST_ID,
    ]);
  });

  it('ignores ids the caller does not own', async () => {
    await useCase.execute(
      new ReorderWorkspacesCommand({
        workspaceIds: [FOREIGN_ID, FIRST_ID, SECOND_ID],
      }),
    );

    expect(repository.updateSortOrders).toHaveBeenCalledWith(TEST_USER_ID, [
      FIRST_ID,
      SECOND_ID,
    ]);
  });

  it('returns the workspaces in their persisted order', async () => {
    const reordered = [
      aWorkspace({ id: SECOND_ID }),
      aWorkspace({ id: FIRST_ID }),
    ];
    repository.findAllByUserId
      .mockResolvedValueOnce([
        aWorkspace({ id: FIRST_ID }),
        aWorkspace({ id: SECOND_ID }),
      ])
      .mockResolvedValueOnce(reordered);

    await expect(
      useCase.execute(
        new ReorderWorkspacesCommand({ workspaceIds: [SECOND_ID, FIRST_ID] }),
      ),
    ).resolves.toBe(reordered);
  });
});
