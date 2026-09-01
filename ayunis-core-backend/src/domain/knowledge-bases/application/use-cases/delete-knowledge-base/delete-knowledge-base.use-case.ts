import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Transactional } from '@nestjs-cls/transactional';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import { DeleteSourcesCommand } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.command';
import { GetSourcesByKnowledgeBaseIdUseCase } from 'src/domain/sources/application/use-cases/get-sources-by-knowledge-base-id/get-sources-by-knowledge-base-id.use-case';
import { GetSourcesByKnowledgeBaseIdQuery } from 'src/domain/sources/application/use-cases/get-sources-by-knowledge-base-id/get-sources-by-knowledge-base-id.query';
import { DeleteKnowledgeBaseCommand } from './delete-knowledge-base.command';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';

@Injectable()
export class DeleteKnowledgeBaseUseCase {
  private readonly logger = new Logger(DeleteKnowledgeBaseUseCase.name);

  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
    private readonly getSourcesByKnowledgeBaseIdUseCase: GetSourcesByKnowledgeBaseIdUseCase,
    private readonly deleteSourcesUseCase: DeleteSourcesUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  @Transactional()
  async execute(command: DeleteKnowledgeBaseCommand): Promise<void> {
    this.logger.log(
      {
        knowledgeBaseId: command.knowledgeBaseId,
        userId: command.userId,
      },
      'Deleting knowledge base',
    );

    const existing = await this.knowledgeBaseRepository.findById(
      command.knowledgeBaseId,
    );
    const hasExpectedOwner = command.workspaceId
      ? existing?.workspaceId === command.workspaceId
      : existing?.userId === command.userId;
    if (!existing || !hasExpectedOwner) {
      throw new KnowledgeBaseNotFoundError(command.knowledgeBaseId);
    }

    const sources = await this.getSourcesByKnowledgeBaseIdUseCase.execute(
      new GetSourcesByKnowledgeBaseIdQuery(command.knowledgeBaseId),
    );
    const sourceIds = sources.map((s) => s.id);
    await this.deleteSourcesUseCase.execute(
      new DeleteSourcesCommand(sourceIds, existing.orgId),
    );

    await this.knowledgeBaseRepository.delete(existing);
  }
}
