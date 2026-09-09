import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-access.service';

@Injectable()
export class FindActiveKnowledgeBasesUseCase {
  private readonly logger = new Logger(FindActiveKnowledgeBasesUseCase.name);

  constructor(
    private readonly knowledgeBaseAccessService: KnowledgeBaseAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(): Promise<PersonalKnowledgeBase[]> {
    this.logger.log('Finding active knowledge bases');
    return this.knowledgeBaseAccessService.findActiveAccessible();
  }
}
