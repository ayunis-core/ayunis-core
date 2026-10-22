import { randomUUID } from 'crypto';
import type { CollectiveKnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/collective-knowledge-base.repository';
import type { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import type { WorkspaceKnowledgeBaseLinkRepository } from 'src/domain/knowledge-bases/application/ports/workspace-knowledge-base-link.repository';
import { OrgKnowledgeBase } from 'src/domain/knowledge-bases/domain/org-knowledge-base.entity';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { OwnerNames } from 'src/domain/ownership/application/models/owner-names';
import { OwnershipViewer } from 'src/domain/ownership/application/models/ownership-viewer';
import type { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import type { NameOwnersUseCase } from 'src/domain/ownership/application/use-cases/name-owners/name-owners.use-case';
import type { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import { ListLinkableWorkspaceKnowledgeBasesQuery } from './list-linkable-workspace-knowledge-bases.query';
import { ListLinkableWorkspaceKnowledgeBasesUseCase } from './list-linkable-workspace-knowledge-bases.use-case';

describe(ListLinkableWorkspaceKnowledgeBasesUseCase.name, () => {
  it('offers only knowledge bases of the caller’s organisation that are not linked yet', async () => {
    const userId = randomUUID();
    const orgId = randomUUID();
    const own = new PersonalKnowledgeBase({
      name: 'Bauordnung',
      userId,
      orgId,
    });
    const linked = new PersonalKnowledgeBase({
      name: 'Satzung',
      userId,
      orgId,
    });
    const foreign = new PersonalKnowledgeBase({
      name: 'Altbestand',
      userId,
      orgId: randomUUID(),
    });
    const org = new OrgKnowledgeBase({ name: 'Vergaberecht', orgId });
    const useCase = new ListLinkableWorkspaceKnowledgeBasesUseCase(
      {
        findByWorkspace: jest
          .fn()
          .mockResolvedValue([{ knowledgeBaseId: linked.id }]),
      } as unknown as WorkspaceKnowledgeBaseLinkRepository,
      {
        findAllByUserId: jest.fn().mockResolvedValue([own, linked, foreign]),
      } as unknown as KnowledgeBaseRepository,
      {
        findUsable: jest.fn().mockResolvedValue([org]),
      } as unknown as CollectiveKnowledgeBaseRepository,
      {
        execute: jest.fn().mockResolvedValue(
          new OwnershipViewer({
            userId,
            orgId,
            isAdmin: false,
            permissions: [],
            memberTeamIds: [],
            adminTeamIds: [],
            teamAdminPermissions: [],
          }),
        ),
      } as unknown as GetOwnershipViewerUseCase,
      {
        execute: jest
          .fn()
          .mockResolvedValue(
            new OwnerNames(new Map([[userId, 'Lena Hoffmann']]), new Map()),
          ),
      } as unknown as NameOwnersUseCase,
      { execute: jest.fn() } as unknown as AssertWorkspaceWriteAccessUseCase,
    );

    const result = await useCase.execute(
      new ListLinkableWorkspaceKnowledgeBasesQuery(randomUUID()),
    );

    expect(result.own.map(({ knowledgeBase }) => knowledgeBase)).toEqual([own]);
    expect(result.org.map(({ knowledgeBase }) => knowledgeBase)).toEqual([org]);
  });
});
