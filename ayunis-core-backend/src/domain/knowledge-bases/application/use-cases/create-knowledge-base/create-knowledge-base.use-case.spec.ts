import { Test } from '@nestjs/testing';
import { getFromUserContext } from 'src/common/context/testing/context.fixtures';
import type { UUID } from 'crypto';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { CreateKnowledgeBaseCommand } from './create-knowledge-base.command';
import { CreateKnowledgeBaseUseCase } from './create-knowledge-base.use-case';
import { KnowledgeBaseWriteAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-write-access.service';
import { TeamKnowledgeBase } from 'src/domain/knowledge-bases/domain/team-knowledge-base.entity';
import { OrgKnowledgeBase } from 'src/domain/knowledge-bases/domain/org-knowledge-base.entity';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { KnowledgeBaseOwner } from 'src/domain/knowledge-bases/application/models/knowledge-base-owner';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: object, _propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

const USER_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const ORG_ID = '22222222-2222-2222-2222-222222222222' as UUID;
const WORKSPACE_ID = '33333333-3333-3333-3333-333333333333' as UUID;

function command(owner: KnowledgeBaseOwner) {
  return new CreateKnowledgeBaseCommand({
    name: 'Municipal building regulations',
    description: 'Regulations used while reviewing permits.',
    owner,
  });
}

async function setup() {
  const repository = {
    save: jest.fn(async (knowledgeBase) => knowledgeBase),
    activate: jest.fn(),
    activateForWorkspace: jest.fn(),
  } as unknown as jest.Mocked<KnowledgeBaseRepository>;
  const context = {
    get: jest.fn(getFromUserContext({ userId: USER_ID, orgId: ORG_ID })),
  } as unknown as jest.Mocked<ContextService>;
  const workspaceWriteAccess = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<AssertWorkspaceWriteAccessUseCase>;
  const writeAccess = { requireCreate: jest.fn() };
  const module = await Test.createTestingModule({
    providers: [
      CreateKnowledgeBaseUseCase,
      { provide: KnowledgeBaseWriteAccessService, useValue: writeAccess },
      { provide: KnowledgeBaseRepository, useValue: repository },
      { provide: ContextService, useValue: context },
      {
        provide: AssertWorkspaceWriteAccessUseCase,
        useValue: workspaceWriteAccess,
      },
    ],
  }).compile();
  return {
    useCase: module.get(CreateKnowledgeBaseUseCase),
    repository,
    workspaceWriteAccess,
    writeAccess,
  };
}

describe(CreateKnowledgeBaseUseCase.name, () => {
  it('creates and activates a personal knowledge base for the authenticated principal', async () => {
    const { useCase, repository } = await setup();

    const result = await useCase.execute(command({ type: 'personal' }));

    expect(result).toBeInstanceOf(PersonalKnowledgeBase);
    expect(result).toMatchObject({ userId: USER_ID, orgId: ORG_ID });
    expect(repository.activate).toHaveBeenCalledWith(result.id, USER_ID);
    expect(repository.activateForWorkspace).not.toHaveBeenCalled();
  });

  it('creates and activates a workspace-owned knowledge base from its explicit owner scope', async () => {
    const { useCase, repository } = await setup();

    const result = await useCase.execute(
      command({ type: 'workspace', workspaceId: WORKSPACE_ID }),
    );

    expect(result).toBeInstanceOf(WorkspaceKnowledgeBase);
    expect(result).toMatchObject({ workspaceId: WORKSPACE_ID, orgId: ORG_ID });
    expect(repository.activateForWorkspace).toHaveBeenCalledWith(
      result.id,
      WORKSPACE_ID,
    );
    expect(repository.activate).not.toHaveBeenCalled();
  });

  it('propagates workspace authorization denial for the requested workspace', async () => {
    const { useCase, repository, workspaceWriteAccess } = await setup();
    const denial = new WorkspaceNotFoundError(WORKSPACE_ID);
    workspaceWriteAccess.execute.mockRejectedValue(denial);

    await expect(
      useCase.execute(
        command({ type: 'workspace', workspaceId: WORKSPACE_ID }),
      ),
    ).rejects.toBe(denial);

    expect(workspaceWriteAccess.execute).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
    });
    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.activateForWorkspace).not.toHaveBeenCalled();
  });

  it('defaults an omitted description without changing personal ownership', async () => {
    const { useCase } = await setup();
    const input = new CreateKnowledgeBaseCommand({
      name: 'Municipal budgets',
      owner: { type: 'personal' },
    });

    const result = await useCase.execute(input);

    expect(result).toMatchObject({
      description: '',
      userId: USER_ID,
      orgId: ORG_ID,
    });
  });

  it('wraps unexpected persistence failures', async () => {
    const { useCase, repository } = await setup();
    repository.save.mockRejectedValue(new Error('Connection refused'));

    await expect(
      useCase.execute(command({ type: 'personal' })),
    ).rejects.toBeInstanceOf(UnexpectedKnowledgeBaseError);
  });

  describe('team- and org-owned knowledge bases', () => {
    const TEAM_ID = '44444444-4444-4444-4444-444444444444' as UUID;

    it('creates a team knowledge base that is active for everyone', async () => {
      const { useCase, repository, writeAccess } = await setup();

      const result = await useCase.execute(
        command({ type: 'team', teamId: TEAM_ID }),
      );

      expect(result).toBeInstanceOf(TeamKnowledgeBase);
      expect(result).toMatchObject({
        teamId: TEAM_ID,
        orgId: ORG_ID,
        isActive: true,
      });
      expect(writeAccess.requireCreate).toHaveBeenCalledWith(result);
      expect(repository.activate).not.toHaveBeenCalled();
    });

    it('creates an org knowledge base in the caller organization', async () => {
      const { useCase } = await setup();

      const result = await useCase.execute(command({ type: 'org' }));

      expect(result).toBeInstanceOf(OrgKnowledgeBase);
      expect(result).toMatchObject({ orgId: ORG_ID, isActive: true });
    });

    it('stores nothing when the caller may not manage the owner', async () => {
      const { useCase, repository, writeAccess } = await setup();
      writeAccess.requireCreate.mockRejectedValue(
        new UnauthorizedAccessError(),
      );

      await expect(
        useCase.execute(command({ type: 'team', teamId: TEAM_ID })),
      ).rejects.toBeInstanceOf(UnauthorizedAccessError);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });
});
