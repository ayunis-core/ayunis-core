import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { lookupOwnerOfKnowledgeBase } from 'src/domain/knowledge-bases/application/models/collective-knowledge-base-owner';
import {
  byKnowledgeBaseName,
  matchesKnowledgeBaseSearch,
  type LinkableKnowledgeBase,
  type LinkableKnowledgeBases,
  type OwnedKnowledgeBase,
} from 'src/domain/knowledge-bases/application/models/linked-knowledge-base';
import { CollectiveKnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/collective-knowledge-base.repository';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { WorkspaceKnowledgeBaseLinkRepository } from 'src/domain/knowledge-bases/application/ports/workspace-knowledge-base-link.repository';
import { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import { NameOwnersQuery } from 'src/domain/ownership/application/use-cases/name-owners/name-owners.query';
import { NameOwnersUseCase } from 'src/domain/ownership/application/use-cases/name-owners/name-owners.use-case';
import { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import { ListLinkableWorkspaceKnowledgeBasesQuery } from './list-linkable-workspace-knowledge-bases.query';

@Injectable()
export class ListLinkableWorkspaceKnowledgeBasesUseCase {
  private readonly logger = new Logger(
    ListLinkableWorkspaceKnowledgeBasesUseCase.name,
  );

  constructor(
    private readonly links: WorkspaceKnowledgeBaseLinkRepository,
    private readonly repository: KnowledgeBaseRepository,
    private readonly collectiveRepository: CollectiveKnowledgeBaseRepository,
    private readonly getViewer: GetOwnershipViewerUseCase,
    private readonly nameOwners: NameOwnersUseCase,
    @Inject(forwardRef(() => AssertWorkspaceWriteAccessUseCase))
    private readonly workspaceWrite: AssertWorkspaceWriteAccessUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(
    query: ListLinkableWorkspaceKnowledgeBasesQuery,
  ): Promise<LinkableKnowledgeBases> {
    this.logger.log(
      { workspaceId: query.workspaceId },
      'Listing linkable workspace knowledge bases',
    );
    await this.workspaceWrite.execute({ workspaceId: query.workspaceId });
    const viewer = await this.getViewer.execute();
    const [links, own, collective] = await Promise.all([
      this.links.findByWorkspace(query.workspaceId),
      this.repository.findAllByUserId(viewer.userId),
      this.collectiveRepository.findUsable({
        userId: viewer.userId,
        orgId: viewer.orgId,
        teamIds: viewer.teamIds,
      }),
    ]);
    const linkedIds = new Set(links.map((link) => link.knowledgeBaseId));
    const candidates: LinkableKnowledgeBase[] = [...own, ...collective].filter(
      (knowledgeBase) =>
        knowledgeBase.orgId === viewer.orgId &&
        !linkedIds.has(knowledgeBase.id) &&
        matchesKnowledgeBaseSearch(knowledgeBase, query.search),
    );
    return this.groupByOwner(candidates);
  }

  private async groupByOwner(
    knowledgeBases: LinkableKnowledgeBase[],
  ): Promise<LinkableKnowledgeBases> {
    const names = await this.nameOwners.execute(
      new NameOwnersQuery(
        knowledgeBases.flatMap((kb) => lookupOwnerOfKnowledgeBase(kb) ?? []),
      ),
    );
    const owned: OwnedKnowledgeBase[] = knowledgeBases.flatMap(
      (knowledgeBase) => {
        const owner = lookupOwnerOfKnowledgeBase(knowledgeBase);
        return owner ? [{ knowledgeBase, owner: names.owner(owner) }] : [];
      },
    );
    const section = (type: OwnedKnowledgeBase['owner']['type']) =>
      owned
        .filter((entry) => entry.owner.type === type)
        .sort(byKnowledgeBaseName);
    return {
      own: section('personal'),
      team: section('team'),
      org: section('org'),
    };
  }
}
