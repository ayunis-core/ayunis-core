jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _prop: string, descriptor: PropertyDescriptor) =>
      descriptor,
  TransactionHost: class TransactionHost {},
}));

import { Test } from '@nestjs/testing';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { AddFavoriteUseCase } from 'src/domain/favorites/application/use-cases/add-favorite/add-favorite.use-case';
import {
  InvalidWorkspaceAppearanceError,
  InvalidWorkspaceDescriptionError,
  InvalidWorkspaceNameError,
} from 'src/domain/workspaces/application/workspaces.errors';
import {
  WORKSPACE_DESCRIPTION_MAX_LENGTH,
  WORKSPACE_NAME_MAX_LENGTH,
} from 'src/domain/workspaces/domain/workspaces.constants';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceMembersRepository } from 'src/domain/workspaces/application/ports/workspace-members-repository.port';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import {
  createMockContextService,
  createMockWorkspaceMembersRepository,
  createMockWorkspacesRepository,
  TEST_ORG_ID,
  TEST_USER_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { CreateWorkspaceCommand } from './create-workspace.command';
import { CreateWorkspaceUseCase } from './create-workspace.use-case';

describe('CreateWorkspaceUseCase', () => {
  let useCase: CreateWorkspaceUseCase;
  let repository: jest.Mocked<WorkspacesRepository>;
  let membersRepository: jest.Mocked<WorkspaceMembersRepository>;
  let addFavoriteUseCase: { execute: jest.Mock };

  async function setup(contextService = createMockContextService()) {
    repository = createMockWorkspacesRepository();
    membersRepository = createMockWorkspaceMembersRepository();
    addFavoriteUseCase = { execute: jest.fn().mockResolvedValue(undefined) };
    const module = await Test.createTestingModule({
      providers: [
        CreateWorkspaceUseCase,
        { provide: WorkspacesRepository, useValue: repository },
        { provide: WorkspaceMembersRepository, useValue: membersRepository },
        { provide: AddFavoriteUseCase, useValue: addFavoriteUseCase },
        { provide: ContextService, useValue: contextService },
      ],
    }).compile();
    useCase = module.get(CreateWorkspaceUseCase);
  }

  beforeEach(async () => {
    await setup();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('makes the caller the admin of the workspace they create', async () => {
    const { workspace, access } = await useCase.execute(
      new CreateWorkspaceCommand({ name: 'Bürgeranfragen' }),
    );

    expect(workspace.orgId).toBe(TEST_ORG_ID);
    expect(workspace.name).toBe('Bürgeranfragen');
    expect(repository.save).toHaveBeenCalledWith(workspace);
    expect(membersRepository.create.mock.calls[0][0]).toMatchObject({
      workspaceId: workspace.id,
      userId: TEST_USER_ID,
      role: UserRole.ADMIN,
    });
    expect(access).toMatchObject({
      role: UserRole.ADMIN,
      permissions: [
        Permission.MANAGE_WORKSPACE,
        Permission.MANAGE_WORKSPACE_MEMBERS,
      ],
    });
  });

  it('creates a workspace without adding it to favorites', async () => {
    const { workspace } = await useCase.execute(
      new CreateWorkspaceCommand({ name: 'Gebühren' }),
    );

    expect(workspace.name).toBe('Gebühren');
    expect(addFavoriteUseCase.execute).not.toHaveBeenCalled();
  });

  it('applies the requested appearance', async () => {
    const { workspace } = await useCase.execute(
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
    const { workspace } = await useCase.execute(
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

  it('rejects an icon that is not a catalogue key', async () => {
    await expect(
      useCase.execute(
        new CreateWorkspaceCommand({ name: 'Feuerwehr', icon: 'Flame!' }),
      ),
    ).rejects.toThrow(InvalidWorkspaceAppearanceError);
  });

  it('rejects a colour that is neither palette key nor hex', async () => {
    await expect(
      useCase.execute(
        new CreateWorkspaceCommand({ name: 'Feuerwehr', color: '#12345' }),
      ),
    ).rejects.toThrow(InvalidWorkspaceAppearanceError);
  });

  it('rejects an unauthenticated caller', async () => {
    await setup(createMockContextService({}));

    await expect(
      useCase.execute(new CreateWorkspaceCommand({ name: 'Bürgeranfragen' })),
    ).rejects.toThrow(UnauthorizedAccessError);
  });
});
