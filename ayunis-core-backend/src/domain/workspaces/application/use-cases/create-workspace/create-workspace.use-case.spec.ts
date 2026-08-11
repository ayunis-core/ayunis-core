import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  InvalidWorkspaceDescriptionError,
  InvalidWorkspaceNameError,
} from 'src/domain/workspaces/domain/workspace.errors';
import {
  WORKSPACE_DESCRIPTION_MAX_LENGTH,
  WORKSPACE_NAME_MAX_LENGTH,
} from 'src/domain/workspaces/domain/workspaces.constants';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import {
  aWorkspace,
  createMockContextService,
  createMockWorkspacesRepository,
  TEST_ORG_ID,
  TEST_USER_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { CreateWorkspaceCommand } from './create-workspace.command';
import { CreateWorkspaceUseCase } from './create-workspace.use-case';

describe('CreateWorkspaceUseCase', () => {
  let useCase: CreateWorkspaceUseCase;
  let repository: jest.Mocked<WorkspacesRepository>;

  async function setup(contextService = createMockContextService()) {
    repository = createMockWorkspacesRepository();
    const module = await Test.createTestingModule({
      providers: [
        CreateWorkspaceUseCase,
        { provide: WorkspacesRepository, useValue: repository },
        { provide: ContextService, useValue: contextService },
      ],
    }).compile();
    useCase = module.get(CreateWorkspaceUseCase);
  }

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  beforeEach(async () => {
    await setup();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a workspace owned by the caller', async () => {
    const workspace = await useCase.execute(
      new CreateWorkspaceCommand({ name: 'Bürgeranfragen' }),
    );

    expect(workspace.userId).toBe(TEST_USER_ID);
    expect(workspace.orgId).toBe(TEST_ORG_ID);
    expect(workspace.name).toBe('Bürgeranfragen');
    expect(repository.save).toHaveBeenCalledWith(workspace);
  });

  it('pins new workspaces so they appear in the sidebar immediately', async () => {
    const workspace = await useCase.execute(
      new CreateWorkspaceCommand({ name: 'Gebühren' }),
    );

    expect(workspace.isPinned).toBe(true);
  });

  it('places the workspace after the existing ones', async () => {
    repository.findAllByUserId.mockResolvedValue([
      aWorkspace({ sortOrder: 0 }),
      aWorkspace({ sortOrder: 4 }),
    ]);

    const workspace = await useCase.execute(
      new CreateWorkspaceCommand({ name: 'Feuerwehr' }),
    );

    expect(workspace.sortOrder).toBe(5);
  });

  it('starts the order at zero for the first workspace', async () => {
    const workspace = await useCase.execute(
      new CreateWorkspaceCommand({ name: 'Feuerwehr' }),
    );

    expect(workspace.sortOrder).toBe(0);
  });

  it('applies the requested appearance', async () => {
    const workspace = await useCase.execute(
      new CreateWorkspaceCommand({
        name: 'Feuerwehr',
        description: 'Einsätze und Fahrzeuge',
        icon: 'flame',
        color: '#6b5bd6',
      }),
    );

    expect(workspace.icon).toBe('flame');
    expect(workspace.color).toBe('#6b5bd6');
    expect(workspace.description).toBe('Einsätze und Fahrzeuge');
  });

  it('rejects a name that is only whitespace', async () => {
    await expect(
      useCase.execute(new CreateWorkspaceCommand({ name: '   ' })),
    ).rejects.toThrow(InvalidWorkspaceNameError);
  });

  it('accepts a name at the maximum length', async () => {
    const workspace = await useCase.execute(
      new CreateWorkspaceCommand({
        name: 'a'.repeat(WORKSPACE_NAME_MAX_LENGTH),
      }),
    );

    expect(workspace.name).toHaveLength(WORKSPACE_NAME_MAX_LENGTH);
  });

  it('rejects a name longer than the maximum length', async () => {
    await expect(
      useCase.execute(
        new CreateWorkspaceCommand({
          name: 'a'.repeat(WORKSPACE_NAME_MAX_LENGTH + 1),
        }),
      ),
    ).rejects.toThrow(InvalidWorkspaceNameError);
  });

  it('rejects a description longer than the maximum length', async () => {
    await expect(
      useCase.execute(
        new CreateWorkspaceCommand({
          name: 'Feuerwehr',
          description: 'a'.repeat(WORKSPACE_DESCRIPTION_MAX_LENGTH + 1),
        }),
      ),
    ).rejects.toThrow(InvalidWorkspaceDescriptionError);
  });

  it('rejects an unauthenticated caller', async () => {
    await setup(createMockContextService({}));

    await expect(
      useCase.execute(new CreateWorkspaceCommand({ name: 'Bürgeranfragen' })),
    ).rejects.toThrow(UnauthorizedAccessError);
  });
});
