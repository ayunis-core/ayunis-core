import { Injectable } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { TextSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { StartUrlCrawlUseCase } from 'src/domain/sources/application/use-cases/start-url-crawl/start-url-crawl.use-case';
import { StartUrlCrawlCommand } from 'src/domain/sources/application/use-cases/start-url-crawl/start-url-crawl.command';
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
  constructor(
    @InjectPinoLogger(AddUrlToKnowledgeBaseUseCase.name)
    private readonly logger: PinoLogger,
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
    private readonly startUrlCrawlUseCase: StartUrlCrawlUseCase,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(command: AddUrlToKnowledgeBaseCommand): Promise<TextSource> {
    this.logger.info(
      {
        knowledgeBaseId: command.knowledgeBaseId,
        url: command.url,
        maxDepth: command.maxDepth,
      },
      'Adding URL to knowledge base (async)',
    );

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
