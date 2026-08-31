import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-access.service';

@Injectable()
export class FindActiveKnowledgeBasesUseCase {
  constructor(
    @InjectPinoLogger(FindActiveKnowledgeBasesUseCase.name)
    private readonly logger: PinoLogger,
    private readonly knowledgeBaseAccessService: KnowledgeBaseAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(): Promise<KnowledgeBase[]> {
    this.logger.info('Finding active knowledge bases');
    return this.knowledgeBaseAccessService.findActiveAccessible();
  }
}
