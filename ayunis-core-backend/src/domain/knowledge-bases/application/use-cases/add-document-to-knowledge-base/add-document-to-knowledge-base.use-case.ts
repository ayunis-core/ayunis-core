import { Injectable, Logger } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { ApplicationError } from 'src/common/errors/base.error';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { StartDocumentProcessingUseCase } from 'src/domain/sources/application/use-cases/start-document-processing/start-document-processing.use-case';
import { StartDocumentProcessingCommand } from 'src/domain/sources/application/use-cases/start-document-processing/start-document-processing.command';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from '../../knowledge-bases.errors';
import { AddDocumentToKnowledgeBaseCommand } from './add-document-to-knowledge-base.command';

@Injectable()
export class AddDocumentToKnowledgeBaseUseCase {
  private readonly logger = new Logger(AddDocumentToKnowledgeBaseUseCase.name);

  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
    private readonly startDocumentProcessingUseCase: StartDocumentProcessingUseCase,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {}

  async execute(
    command: AddDocumentToKnowledgeBaseCommand,
  ): Promise<FileSource> {
    this.logger.log('Adding document to knowledge base (async)', {
      knowledgeBaseId: command.knowledgeBaseId,
      fileName: command.fileName,
    });

    try {
      // 1. Validate KB exists and belongs to user (in transaction)
      await this.txHost.withTransaction(async () => {
        const knowledgeBase = await this.knowledgeBaseRepository.findById(
          command.knowledgeBaseId,
        );
        if (knowledgeBase?.userId !== command.userId) {
          throw new KnowledgeBaseNotFoundError(command.knowledgeBaseId);
        }
      });

      // 2. Start async document processing (creates PROCESSING source, uploads to MinIO, enqueues job)
      const savedSource = await this.startDocumentProcessingUseCase.execute(
        new StartDocumentProcessingCommand({
          fileData: command.fileData,
          fileName: command.fileName,
          fileType: command.fileType,
        }),
      );

      // 3. Assign source to KB
      await this.knowledgeBaseRepository.assignSourceToKnowledgeBase(
        savedSource.id,
        command.knowledgeBaseId,
      );

      return savedSource;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error adding document to knowledge base', {
        error: error as Error,
      });
      throw new UnexpectedKnowledgeBaseError(
        'Error adding document to knowledge base',
        { error: error as Error },
      );
    }
  }
}
