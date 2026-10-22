import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import {
  WorkspaceKnowledgeBaseLinkRepository,
  type PersonalKnowledgeBaseLink,
  type PersonalKnowledgeBaseLinkFilter,
} from 'src/domain/knowledge-bases/application/ports/workspace-knowledge-base-link.repository';

@Injectable()
export class FindPersonalKnowledgeBaseLinksUseCase {
  private readonly logger = new Logger(
    FindPersonalKnowledgeBaseLinksUseCase.name,
  );

  constructor(private readonly links: WorkspaceKnowledgeBaseLinkRepository) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(
    filter: PersonalKnowledgeBaseLinkFilter,
  ): Promise<PersonalKnowledgeBaseLink[]> {
    this.logger.debug(
      {
        workspaceCount: filter.workspaceIds?.length,
        ownerCount: filter.ownerIds?.length,
      },
      'Finding links of personal knowledge bases',
    );
    return this.links.findPersonalLinks(filter);
  }
}
