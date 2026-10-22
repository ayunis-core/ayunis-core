import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import {
  WorkspaceKnowledgeBaseLinkRepository,
  type PersonalKnowledgeBaseLink,
} from 'src/domain/knowledge-bases/application/ports/workspace-knowledge-base-link.repository';

@Injectable()
export class RemoveKnowledgeBaseLinksUseCase {
  private readonly logger = new Logger(RemoveKnowledgeBaseLinksUseCase.name);

  constructor(private readonly links: WorkspaceKnowledgeBaseLinkRepository) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(
    links: Pick<PersonalKnowledgeBaseLink, 'workspaceId' | 'knowledgeBaseId'>[],
  ): Promise<number> {
    this.logger.log({ count: links.length }, 'Removing knowledge base links');
    return this.links.removeMany(links);
  }
}
