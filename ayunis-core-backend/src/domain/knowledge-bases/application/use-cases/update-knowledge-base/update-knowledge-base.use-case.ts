import { Injectable } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import { UpdateKnowledgeBaseCommand } from './update-knowledge-base.command';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';

@Injectable()
export class UpdateKnowledgeBaseUseCase {
  constructor(
    @InjectPinoLogger(UpdateKnowledgeBaseUseCase.name)
    private readonly logger: PinoLogger,
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(command: UpdateKnowledgeBaseCommand): Promise<KnowledgeBase> {
    this.logger.info(
      {
        knowledgeBaseId: command.knowledgeBaseId,
        userId: command.userId,
      },
      'Updating knowledge base',
    );

    const existing = await this.knowledgeBaseRepository.findById(
      command.knowledgeBaseId,
    );
    if (existing?.userId !== command.userId) {
      throw new KnowledgeBaseNotFoundError(command.knowledgeBaseId);
    }

    const updated = new KnowledgeBase({
      id: existing.id,
      name: command.name ?? existing.name,
      description: command.description ?? existing.description,
      orgId: existing.orgId,
      userId: existing.userId,
      workspaceId: existing.workspaceId,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    });

    return await this.knowledgeBaseRepository.save(updated);
  }
}
