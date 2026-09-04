import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { StartDocumentProcessingUseCase } from 'src/domain/sources/application/use-cases/start-document-processing/start-document-processing.use-case';
import { StartDocumentProcessingCommand } from 'src/domain/sources/application/use-cases/start-document-processing/start-document-processing.command';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
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
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
    private readonly startDocumentProcessingUseCase: StartDocumentProcessingUseCase,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(
    command: AddDocumentToKnowledgeBaseCommand,
  ): Promise<FileSource> {
    this.logger.log(
      {
        knowledgeBaseId: command.knowledgeBaseId,
        fileName: command.fileName,
      },
      'Adding document to knowledge base (async)',
    );

    await this.assertSourceCapacity(command);

    // Start async document processing (creates PROCESSING source, uploads to MinIO, enqueues job)
    const savedSource = await this.startDocumentProcessingUseCase.execute(
      new StartDocumentProcessingCommand({
        fileData: command.fileData,
        fileName: command.fileName,
        fileType: command.fileType,
      }),
    );

    await this.knowledgeBaseRepository.assignSourceToKnowledgeBase(
      savedSource.id,
      command.knowledgeBaseId,
    );

    return savedSource;
  }

  private async assertSourceCapacity(
    command: AddDocumentToKnowledgeBaseCommand,
  ): Promise<void> {
    await this.txHost.withTransaction(async () => {
      const knowledgeBase = await this.knowledgeBaseRepository.findById(
        command.knowledgeBaseId,
      );
      if (knowledgeBase?.userId !== command.userId) {
        throw new KnowledgeBaseNotFoundError(command.knowledgeBaseId);
      }

      const sourceCount =
        await this.knowledgeBaseRepository.countSourcesByKnowledgeBaseId(
          command.knowledgeBaseId,
        );
      if (sourceCount >= KnowledgeBasesConstants.MAX_SOURCES) {
        throw new KnowledgeBaseSourceLimitExceededError(
          KnowledgeBasesConstants.MAX_SOURCES,
        );
      }
    });
  }
}
