import { Injectable, Logger } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { StartDocumentProcessingUseCase } from 'src/domain/sources/application/use-cases/start-document-processing/start-document-processing.use-case';
import { StartDocumentProcessingCommand } from 'src/domain/sources/application/use-cases/start-document-processing/start-document-processing.command';
import { DeleteSourceUseCase } from 'src/domain/sources/application/use-cases/delete-source/delete-source.use-case';
import { DeleteSourceCommand } from 'src/domain/sources/application/use-cases/delete-source/delete-source.command';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseWriteAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-write-access.service';
import {
  KnowledgeBaseNotFoundError,
  KnowledgeBaseSourceLimitExceededError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBasesConstants } from 'src/domain/knowledge-bases/domain/knowledge-bases.constants';
import { AddDocumentToKnowledgeBaseCommand } from './add-document-to-knowledge-base.command';

@Injectable()
export class AddDocumentToKnowledgeBaseUseCase {
  private readonly logger = new Logger(AddDocumentToKnowledgeBaseUseCase.name);
  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly access: KnowledgeBaseWriteAccessService,
    private readonly processing: StartDocumentProcessingUseCase,
    private readonly deleteSource: DeleteSourceUseCase,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(
    command: AddDocumentToKnowledgeBaseCommand,
  ): Promise<FileSource> {
    const { knowledgeBaseId, file } = command;
    this.logger.log(
      { knowledgeBaseId, fileName: file.name },
      'Adding document to knowledge base',
    );
    // Preserve the preflight transaction; external processing stays outside it.
    // This is a capacity check, not a reservation against concurrent uploads.
    const knowledgeBase = await this.txHost.withTransaction(async () => {
      const knowledgeBase = await this.repository.findById(knowledgeBaseId);
      if (!knowledgeBase) throw new KnowledgeBaseNotFoundError(knowledgeBaseId);
      await this.access.requireWrite(knowledgeBase);
      const count =
        await this.repository.countSourcesByKnowledgeBaseId(knowledgeBaseId);
      if (count >= KnowledgeBasesConstants.MAX_SOURCES) {
        throw new KnowledgeBaseSourceLimitExceededError(
          KnowledgeBasesConstants.MAX_SOURCES,
        );
      }
      return knowledgeBase;
    });
    const source = await this.processing.execute(
      new StartDocumentProcessingCommand({
        fileData: file.data,
        fileName: file.name,
        fileType: file.type,
      }),
    );
    try {
      await this.repository.assignSourceToKnowledgeBase(
        source.id,
        knowledgeBaseId,
      );
    } catch (assignmentError) {
      try {
        await this.deleteSource.execute(
          new DeleteSourceCommand(source.id, knowledgeBase.orgId),
        );
      } catch (cleanupError) {
        this.logger.error(
          { sourceId: source.id, cleanupError },
          'Failed to clean up unassigned source',
        );
      }
      throw assignmentError;
    }
    return source;
  }
}
