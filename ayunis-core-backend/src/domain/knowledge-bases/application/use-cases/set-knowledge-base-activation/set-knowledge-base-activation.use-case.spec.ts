import { Test } from '@nestjs/testing';
import { randomUUID, type UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseReadAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-read-access.service';
import { KnowledgeBaseWriteAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-write-access.service';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SetKnowledgeBaseActivationCommand } from './set-knowledge-base-activation.command';
import { SetKnowledgeBaseActivationUseCase } from './set-knowledge-base-activation.use-case';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: object, _propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

const USER_ID = '11111111-1111-1111-1111-111111111111' as UUID;
const OTHER_USER_ID = '22222222-2222-2222-2222-222222222222' as UUID;
const ORG_ID = '33333333-3333-3333-3333-333333333333' as UUID;
const WORKSPACE_ID = '44444444-4444-4444-4444-444444444444' as UUID;

async function setup(knowledgeBase: KnowledgeBase) {
  const repository = {
    findById: jest.fn().mockResolvedValue(knowledgeBase),
    activate: jest.fn(),
    deactivate: jest.fn(),
    activateForWorkspace: jest.fn(),
    deactivateForWorkspace: jest.fn(),
  };
  const readAccess = {
    requireRead: jest.fn(),
  } as unknown as jest.Mocked<KnowledgeBaseReadAccessService>;
  const writeAccess = {
    requireWrite: jest.fn(),
  } as unknown as jest.Mocked<KnowledgeBaseWriteAccessService>;
  const context = {
    get: jest.fn((key: string) => {
      if (key === 'userId') return USER_ID;
      if (key === 'orgId') return ORG_ID;
      if (key === 'role') return UserRole.MANAGER;
      return undefined;
    }),
  };
  const hasPermission = { execute: jest.fn().mockResolvedValue(true) };
  const module = await Test.createTestingModule({
    providers: [
      SetKnowledgeBaseActivationUseCase,
      { provide: KnowledgeBaseRepository, useValue: repository },
      { provide: KnowledgeBaseReadAccessService, useValue: readAccess },
      { provide: KnowledgeBaseWriteAccessService, useValue: writeAccess },
      { provide: ContextService, useValue: context },
      { provide: HasPermissionUseCase, useValue: hasPermission },
    ],
  }).compile();
  return {
    useCase: module.get(SetKnowledgeBaseActivationUseCase),
    repository,
    readAccess,
    writeAccess,
    hasPermission,
  };
}

describe(SetKnowledgeBaseActivationUseCase.name, () => {
  it.each([
    ['owned', USER_ID],
    ['shared', OTHER_USER_ID],
  ])(
    'stores %s personal activation for the authenticated user',
    async (_access, ownerId) => {
      const knowledgeBase = new PersonalKnowledgeBase({
        name: 'Permit guidance',
        userId: ownerId,
        orgId: ORG_ID,
      });
      const { useCase, repository, hasPermission } = await setup(knowledgeBase);

      await expect(
        useCase.execute(
          new SetKnowledgeBaseActivationCommand(knowledgeBase.id, true),
        ),
      ).resolves.toBe(knowledgeBase);

      expect(repository.activate).toHaveBeenCalledWith(
        knowledgeBase.id,
        USER_ID,
      );
      expect(repository.activateForWorkspace).not.toHaveBeenCalled();
      expect(hasPermission.execute).not.toHaveBeenCalled();
    },
  );

  it('stores workspace activation under the persisted workspace owner', async () => {
    const knowledgeBase = new WorkspaceKnowledgeBase({
      name: 'Project regulations',
      workspaceId: WORKSPACE_ID,
      orgId: ORG_ID,
    });
    const { useCase, repository, writeAccess, hasPermission } =
      await setup(knowledgeBase);

    await expect(
      useCase.execute(
        new SetKnowledgeBaseActivationCommand(knowledgeBase.id, false),
      ),
    ).resolves.toBe(knowledgeBase);

    expect(writeAccess.requireWrite).toHaveBeenCalledWith(knowledgeBase);
    expect(repository.deactivateForWorkspace).toHaveBeenCalledWith(
      knowledgeBase.id,
      WORKSPACE_ID,
    );
    expect(repository.deactivate).not.toHaveBeenCalled();
    expect(hasPermission.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: ORG_ID,
        role: UserRole.MANAGER,
        permission: Permission.MANAGE_KNOWLEDGE_BASES,
      }),
    );
  });

  it('rejects workspace activation without the manage knowledge bases permission', async () => {
    const knowledgeBase = new WorkspaceKnowledgeBase({
      name: 'Project regulations',
      workspaceId: WORKSPACE_ID,
      orgId: ORG_ID,
    });
    const { useCase, repository, hasPermission } = await setup(knowledgeBase);
    hasPermission.execute.mockResolvedValue(false);

    await expect(
      useCase.execute(
        new SetKnowledgeBaseActivationCommand(knowledgeBase.id, true),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedAccessError);
    expect(repository.activateForWorkspace).not.toHaveBeenCalled();
  });

  it('does not change activation when workspace write access is denied', async () => {
    const knowledgeBase = new WorkspaceKnowledgeBase({
      name: 'Restricted project regulations',
      workspaceId: WORKSPACE_ID,
      orgId: randomUUID(),
    });
    const { useCase, repository, writeAccess } = await setup(knowledgeBase);
    writeAccess.requireWrite.mockRejectedValue(
      new KnowledgeBaseNotFoundError(knowledgeBase.id),
    );

    await expect(
      useCase.execute(
        new SetKnowledgeBaseActivationCommand(knowledgeBase.id, true),
      ),
    ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
    expect(repository.activate).not.toHaveBeenCalled();
    expect(repository.activateForWorkspace).not.toHaveBeenCalled();
  });
});
