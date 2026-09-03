import { Injectable, Logger } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { TextSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { StartUrlCrawlUseCase } from 'src/domain/sources/application/use-cases/start-url-crawl/start-url-crawl.use-case';
import { StartUrlCrawlCommand } from 'src/domain/sources/application/use-cases/start-url-crawl/start-url-crawl.command';
import { ApplicationError } from 'src/common/errors/base.error';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import {
  KnowledgeBaseNotFoundError,
  KnowledgeBaseSourceLimitExceededError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBasesConstants } from 'src/domain/knowledge-bases/domain/knowledge-bases.constants';
import { AddUrlToKnowledgeBaseCommand } from './add-url-to-knowledge-base.command';

@Injectable()
export class AddUrlToKnowledgeBaseUseCase {
  private readonly logger = new Logger(AddUrlToKnowledgeBaseUseCase.name);

  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
    private readonly startUrlCrawlUseCase: StartUrlCrawlUseCase,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {}

  async execute(command: AddUrlToKnowledgeBaseCommand): Promise<TextSource> {
    this.logger.log(
      {
        knowledgeBaseId: command.knowledgeBaseId,
        url: command.url,
        maxDepth: command.maxDepth,
      },
      'Adding URL to knowledge base (async)',
    );

    try {
      await this.assertSourceCapacity(command);

      // Start async crawl (creates PROCESSING source, enqueues job)
      const source = await this.startUrlCrawlUseCase.execute(
        new StartUrlCrawlCommand({
          url: command.url,
          maxDepth: command.maxDepth,
        }),
      );

      await this.knowledgeBaseRepository.assignSourceToKnowledgeBase(
        source.id,
        command.knowledgeBaseId,
      );

      return source;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
        },
        'Error adding URL to knowledge base',
      );
      throw new UnexpectedKnowledgeBaseError(
        'Error adding URL to knowledge base',
        { err: error as Error },
      );
    }
  }

  private async assertSourceCapacity(
    command: AddUrlToKnowledgeBaseCommand,
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
