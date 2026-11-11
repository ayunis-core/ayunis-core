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
import { TeamKnowledgeBase } from 'src/domain/knowledge-bases/domain/team-knowledge-base.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
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
      if (key === 'systemRole') return SystemRole.CUSTOMER;
      return undefined;
    }),
  };
  const module = await Test.createTestingModule({
    providers: [
      SetKnowledgeBaseActivationUseCase,
      { provide: KnowledgeBaseRepository, useValue: repository },
      { provide: KnowledgeBaseReadAccessService, useValue: readAccess },
      { provide: KnowledgeBaseWriteAccessService, useValue: writeAccess },
      { provide: ContextService, useValue: context },
    ],
  }).compile();
  return {
    useCase: module.get(SetKnowledgeBaseActivationUseCase),
    repository,
    readAccess,
    writeAccess,
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
      const { useCase, repository } = await setup(knowledgeBase);

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
    },
  );

  it('stores workspace activation under the persisted workspace owner', async () => {
    const knowledgeBase = new WorkspaceKnowledgeBase({
      name: 'Project regulations',
      workspaceId: WORKSPACE_ID,
      orgId: ORG_ID,
    });
    const { useCase, repository, writeAccess } = await setup(knowledgeBase);

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
  });

  it('rejects workspace activation for a member without manage_workspace', async () => {
    const knowledgeBase = new WorkspaceKnowledgeBase({
      name: 'Project regulations',
      workspaceId: WORKSPACE_ID,
      orgId: ORG_ID,
    });
    const { useCase, repository, writeAccess } = await setup(knowledgeBase);
    writeAccess.requireWrite.mockRejectedValue(new UnauthorizedAccessError());

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

  describe('team-owned knowledge bases', () => {
    const team = () =>
      new TeamKnowledgeBase({
        name: 'Bauordnung',
        orgId: ORG_ID,
        teamId: randomUUID(),
        isActive: true,
      });

    it('switches it off for everyone after manage authorization', async () => {
      const knowledgeBase = team();
      const { useCase, repository, writeAccess, readAccess } =
        await setup(knowledgeBase);
      const save = jest.fn(async (saved: KnowledgeBase) => saved);
      Object.assign(repository, { save });

      const result = await useCase.execute(
        new SetKnowledgeBaseActivationCommand(knowledgeBase.id, false),
      );

      expect(repository.findById).toHaveBeenCalledWith(knowledgeBase.id, {
        lock: true,
      });
      expect(writeAccess.requireWrite).toHaveBeenCalledWith(knowledgeBase);
      expect(readAccess.requireRead).not.toHaveBeenCalled();
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({ id: knowledgeBase.id, isActive: false }),
      );
      expect(result).toMatchObject({ isActive: false });
      expect(repository.deactivate).not.toHaveBeenCalled();
    });

    it('does not change it for members who cannot manage it', async () => {
      const knowledgeBase = team();
      const { useCase, repository, writeAccess } = await setup(knowledgeBase);
      const save = jest.fn();
      Object.assign(repository, { save });
      writeAccess.requireWrite.mockRejectedValue(new UnauthorizedAccessError());

      await expect(
        useCase.execute(
          new SetKnowledgeBaseActivationCommand(knowledgeBase.id, false),
        ),
      ).rejects.toBeInstanceOf(UnauthorizedAccessError);
      expect(save).not.toHaveBeenCalled();
    });
  });
});
