import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import type { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';

@Injectable()
export class FindActiveKnowledgeBasesUseCase {
  private readonly logger = new Logger(FindActiveKnowledgeBasesUseCase.name);

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(): Promise<PersonalKnowledgeBase[]> {
    this.logger.log('Finding active knowledge bases');
    const userId = this.context.get('userId');
    const orgId = this.context.get('orgId');
    if (!userId || !orgId) throw new UnauthorizedAccessError();
    return this.repository.findActiveAccessible(userId, orgId);
  }
}
