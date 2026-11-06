import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseWriteAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-write-access.service';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { UpdateKnowledgeBaseCommand } from './update-knowledge-base.command';

@Injectable()
export class UpdateKnowledgeBaseUseCase {
  private readonly logger = new Logger(UpdateKnowledgeBaseUseCase.name);

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly writeAccess: KnowledgeBaseWriteAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  @Transactional()
  async execute(command: UpdateKnowledgeBaseCommand): Promise<KnowledgeBase> {
    this.logger.log(
      { knowledgeBaseId: command.knowledgeBaseId },
      'Updating knowledge base',
    );
    // The lock keeps a concurrent owner change from being overwritten.
    const existing = await this.repository.findById(command.knowledgeBaseId, {
      lock: true,
    });
    if (!existing) {
      throw new KnowledgeBaseNotFoundError(command.knowledgeBaseId);
    }
    await this.writeAccess.requireWrite(existing);

    existing.name = command.name ?? existing.name;
    existing.description = command.description ?? existing.description;
    existing.updatedAt = new Date();
    return this.repository.save(existing);
  }
}
