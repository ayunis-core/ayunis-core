import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { lookupOwnerOfKnowledgeBase } from 'src/domain/knowledge-bases/application/models/collective-knowledge-base-owner';
import {
  byKnowledgeBaseName,
  matchesKnowledgeBaseSearch,
  type LinkableKnowledgeBase,
  type LinkedKnowledgeBase,
} from 'src/domain/knowledge-bases/application/models/linked-knowledge-base';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import {
  WorkspaceKnowledgeBaseLinkRepository,
  type WorkspaceKnowledgeBaseLink,
} from 'src/domain/knowledge-bases/application/ports/workspace-knowledge-base-link.repository';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { NameOwnersQuery } from 'src/domain/ownership/application/use-cases/name-owners/name-owners.query';
import { NameOwnersUseCase } from 'src/domain/ownership/application/use-cases/name-owners/name-owners.use-case';
import { AssertWorkspaceReadAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-read-access/assert-workspace-read-access.use-case';
import { ListLinkedWorkspaceKnowledgeBasesQuery } from './list-linked-workspace-knowledge-bases.query';

@Injectable()
export class ListLinkedWorkspaceKnowledgeBasesUseCase {
  private readonly logger = new Logger(
    ListLinkedWorkspaceKnowledgeBasesUseCase.name,
  );

  constructor(
    private readonly links: WorkspaceKnowledgeBaseLinkRepository,
    private readonly repository: KnowledgeBaseRepository,
    private readonly nameOwners: NameOwnersUseCase,
    @Inject(forwardRef(() => AssertWorkspaceReadAccessUseCase))
    private readonly workspaceRead: AssertWorkspaceReadAccessUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(
    query: ListLinkedWorkspaceKnowledgeBasesQuery,
  ): Promise<LinkedKnowledgeBase[]> {
    this.logger.log(
      { workspaceId: query.workspaceId },
      'Listing linked workspace knowledge bases',
    );
    await this.workspaceRead.execute({ workspaceId: query.workspaceId });
    const links = await this.links.findByWorkspace(query.workspaceId);
    const knowledgeBases = (
      await this.repository.findByIds(
        links.map(({ knowledgeBaseId }) => knowledgeBaseId),
      )
    ).filter(
      (knowledgeBase): knowledgeBase is LinkableKnowledgeBase =>
        !(knowledgeBase instanceof WorkspaceKnowledgeBase) &&
        matchesKnowledgeBaseSearch(knowledgeBase, query.search),
    );
    return this.describe(knowledgeBases, links);
  }

  private async describe(
    knowledgeBases: LinkableKnowledgeBase[],
    links: WorkspaceKnowledgeBaseLink[],
  ): Promise<LinkedKnowledgeBase[]> {
    const names = await this.nameOwners.execute(
      new NameOwnersQuery(
        knowledgeBases.flatMap((kb) => lookupOwnerOfKnowledgeBase(kb) ?? []),
        links.map(({ linkedByUserId }) => linkedByUserId),
      ),
    );
    const linkById = new Map(links.map((link) => [link.knowledgeBaseId, link]));
    return knowledgeBases
      .flatMap((knowledgeBase) => {
        const owner = lookupOwnerOfKnowledgeBase(knowledgeBase);
        const link = linkById.get(knowledgeBase.id);
        return owner && link
          ? [
              {
                knowledgeBase,
                owner: names.owner(owner),
                linkedBy: names.person(link.linkedByUserId),
                linkedAt: link.linkedAt,
              },
            ]
          : [];
      })
      .sort(byKnowledgeBaseName);
  }
}
