import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { LockKnowledgeBaseCommand } from './lock-knowledge-base.command';

/**
 * Locks the knowledge base row until the caller's transaction ends. Deleting
 * a knowledge base locks its row before the rows that cascade from it, so a
 * caller that also locks such rows takes this lock first to keep the same
 * order. For trusted callers (the sync engine).
 */
@Injectable()
export class LockKnowledgeBaseUseCase {
  private readonly logger = new Logger(LockKnowledgeBaseUseCase.name);

  constructor(private readonly repository: KnowledgeBaseRepository) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(command: LockKnowledgeBaseCommand): Promise<void> {
    this.logger.debug({ knowledgeBaseId: command.knowledgeBaseId }, 'execute');
    const knowledgeBase = await this.repository.findById(
      command.knowledgeBaseId,
      { lock: true },
    );
    if (!knowledgeBase)
      throw new KnowledgeBaseNotFoundError(command.knowledgeBaseId);
  }
}
