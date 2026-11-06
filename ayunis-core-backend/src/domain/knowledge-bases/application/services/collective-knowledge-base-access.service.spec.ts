import { randomUUID } from 'crypto';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { OrgKnowledgeBase } from 'src/domain/knowledge-bases/domain/org-knowledge-base.entity';
import { TeamKnowledgeBase } from 'src/domain/knowledge-bases/domain/team-knowledge-base.entity';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import type { GetCollectiveOwnerAccessUseCase } from 'src/iam/teams/application/use-cases/get-collective-owner-access/get-collective-owner-access.use-case';
import type { ListReadableCollectiveOwnersUseCase } from 'src/iam/teams/application/use-cases/list-readable-collective-owners/list-readable-collective-owners.use-case';
import { CollectiveKnowledgeBaseAccessService } from './collective-knowledge-base-access.service';

describe(CollectiveKnowledgeBaseAccessService.name, () => {
  const orgId = randomUUID();
  const team = new TeamKnowledgeBase({
    name: 'Bauordnung',
    orgId,
    teamId: randomUUID(),
  });
  const org = new OrgKnowledgeBase({ name: 'Satzungen', orgId });

  function setup(access: { canRead: boolean; canManage: boolean }) {
    const getOwnerAccess = { execute: jest.fn().mockResolvedValue(access) };
    const service = new CollectiveKnowledgeBaseAccessService(
      getOwnerAccess as unknown as GetCollectiveOwnerAccessUseCase,
      { execute: jest.fn() } as unknown as ListReadableCollectiveOwnersUseCase,
    );
    return { getOwnerAccess, service };
  }

  it('asks for team access with the knowledge-base share permissions', async () => {
    const { service, getOwnerAccess } = setup({
      canRead: true,
      canManage: true,
    });

    await service.requireWrite(team);

    expect(getOwnerAccess.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: { type: 'team', teamId: team.teamId },
        permissions: {
          manage: Permission.MANAGE_KNOWLEDGE_BASES,
          team: Permission.SHARE_KNOWLEDGE_BASES_WITH_TEAMS,
          org: Permission.SHARE_KNOWLEDGE_BASES_WITH_ORG,
        },
      }),
    );
  });

  it('asks only for read access to the owning organization when reading', async () => {
    const { service, getOwnerAccess } = setup({
      canRead: true,
      canManage: false,
    });

    await service.requireRead(org);

    expect(getOwnerAccess.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: { type: 'org', orgId },
        permissions: undefined,
      }),
    );
  });

  it('hides knowledge bases the user cannot read', async () => {
    const { service } = setup({ canRead: false, canManage: false });

    await expect(service.requireRead(team)).rejects.toBeInstanceOf(
      KnowledgeBaseNotFoundError,
    );
    await expect(service.requireWrite(team)).rejects.toBeInstanceOf(
      KnowledgeBaseNotFoundError,
    );
  });

  it('forbids changes to readable knowledge bases the user cannot manage', async () => {
    const { service } = setup({ canRead: true, canManage: false });

    await expect(service.requireWrite(org)).rejects.toBeInstanceOf(
      UnauthorizedAccessError,
    );
    await expect(service.requireManage(org)).rejects.toBeInstanceOf(
      UnauthorizedAccessError,
    );
  });
});
