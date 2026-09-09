import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseWriteAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-write-access.service';
import { DeleteSourcesCommand } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.command';
import { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import { GetSourcesByKnowledgeBaseIdQuery } from 'src/domain/sources/application/use-cases/get-sources-by-knowledge-base-id/get-sources-by-knowledge-base-id.query';
import { GetSourcesByKnowledgeBaseIdUseCase } from 'src/domain/sources/application/use-cases/get-sources-by-knowledge-base-id/get-sources-by-knowledge-base-id.use-case';
import { DeleteKnowledgeBaseCommand } from './delete-knowledge-base.command';

@Injectable()
export class DeleteKnowledgeBaseUseCase {
  private readonly logger = new Logger(DeleteKnowledgeBaseUseCase.name);

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly writeAccess: KnowledgeBaseWriteAccessService,
    private readonly getSources: GetSourcesByKnowledgeBaseIdUseCase,
    private readonly deleteSources: DeleteSourcesUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  @Transactional()
  async execute(command: DeleteKnowledgeBaseCommand): Promise<void> {
    this.logger.log(
      { knowledgeBaseId: command.knowledgeBaseId },
      'Deleting knowledge base',
    );
    const existing = await this.repository.findById(command.knowledgeBaseId);
    if (!existing) {
      throw new KnowledgeBaseNotFoundError(command.knowledgeBaseId);
    }
    await this.writeAccess.requireWrite(existing);

    const sources = await this.getSources.execute(
      new GetSourcesByKnowledgeBaseIdQuery(existing.id),
    );
    await this.deleteSources.execute(
      new DeleteSourcesCommand(
        sources.map(({ id }) => id),
        existing.orgId,
      ),
    );
    await this.repository.delete(existing);
  }
}
