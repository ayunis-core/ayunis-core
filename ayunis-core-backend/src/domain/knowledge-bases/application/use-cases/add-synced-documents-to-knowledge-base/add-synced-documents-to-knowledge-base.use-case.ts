import { Injectable, Logger } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBasesConstants } from 'src/domain/knowledge-bases/domain/knowledge-bases.constants';
import { CreateProcessingFileSourcesCommand } from 'src/domain/sources/application/use-cases/create-processing-file-sources/create-processing-file-sources.command';
import { CreateProcessingFileSourcesUseCase } from 'src/domain/sources/application/use-cases/create-processing-file-sources/create-processing-file-sources.use-case';
import type { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { AddSyncedDocumentsToKnowledgeBaseCommand } from './add-synced-documents-to-knowledge-base.command';

/**
 * Creates PROCESSING documents for as many of the files as the knowledge
 * base still has room for, under the same row lock as uploads and URLs, and
 * returns them in the order of the names. For trusted callers only (the sync
 * engine, which authorized the location when it was added).
 */
@Injectable()
export class AddSyncedDocumentsToKnowledgeBaseUseCase {
  private readonly logger = new Logger(
    AddSyncedDocumentsToKnowledgeBaseUseCase.name,
  );

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly createSources: CreateProcessingFileSourcesUseCase,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(
    command: AddSyncedDocumentsToKnowledgeBaseCommand,
  ): Promise<FileSource[]> {
    const { knowledgeBaseId, fileNames } = command;
    this.logger.log(
      { knowledgeBaseId, count: fileNames.length },
      'Adding synced documents to knowledge base',
    );
    if (fileNames.length === 0) return [];
    return this.txHost.withTransaction(async () => {
      const knowledgeBase = await this.repository.findById(knowledgeBaseId, {
        lock: true,
      });
      if (!knowledgeBase) throw new KnowledgeBaseNotFoundError(knowledgeBaseId);
      const count =
        await this.repository.countSourcesByKnowledgeBaseId(knowledgeBaseId);
      const room = Math.max(0, KnowledgeBasesConstants.MAX_SOURCES - count);
      if (room === 0) return [];
      return this.createSources.execute(
        new CreateProcessingFileSourcesCommand(
          knowledgeBaseId,
          fileNames.slice(0, room),
        ),
      );
    });
  }
}
