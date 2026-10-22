import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { WorkspaceKnowledgeBaseLinkRepository } from 'src/domain/knowledge-bases/application/ports/workspace-knowledge-base-link.repository';
import { KnowledgeBaseReadAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-read-access.service';
import { DescribeLinkedWorkspacesQuery } from 'src/domain/workspaces/application/use-cases/describe-linked-workspaces/describe-linked-workspaces.query';
import { DescribeLinkedWorkspacesUseCase } from 'src/domain/workspaces/application/use-cases/describe-linked-workspaces/describe-linked-workspaces.use-case';
import type { LinkedWorkspaces } from 'src/domain/workspaces/domain/workspace-link';
import { ListKnowledgeBaseLinkedWorkspacesQuery } from './list-knowledge-base-linked-workspaces.query';

@Injectable()
export class ListKnowledgeBaseLinkedWorkspacesUseCase {
  private readonly logger = new Logger(
    ListKnowledgeBaseLinkedWorkspacesUseCase.name,
  );

  constructor(
    private readonly links: WorkspaceKnowledgeBaseLinkRepository,
    private readonly repository: KnowledgeBaseRepository,
    private readonly access: KnowledgeBaseReadAccessService,
    @Inject(forwardRef(() => DescribeLinkedWorkspacesUseCase))
    private readonly describeLinkedWorkspaces: DescribeLinkedWorkspacesUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(
    query: ListKnowledgeBaseLinkedWorkspacesQuery,
  ): Promise<LinkedWorkspaces> {
    this.logger.log(
      query,
      'Listing workspaces a knowledge base is linked into',
    );
    const knowledgeBase = await this.repository.findById(query.knowledgeBaseId);
    if (!knowledgeBase) {
      throw new KnowledgeBaseNotFoundError(query.knowledgeBaseId);
    }
    await this.access.requireView(knowledgeBase);
    const links = await this.links.findByKnowledgeBase(knowledgeBase.id);
    return this.describeLinkedWorkspaces.execute(
      new DescribeLinkedWorkspacesQuery(links),
    );
  }
}
