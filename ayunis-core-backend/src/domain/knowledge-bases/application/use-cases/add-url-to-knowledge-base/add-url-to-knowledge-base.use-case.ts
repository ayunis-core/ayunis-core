import { Injectable, Logger } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  KnowledgeBaseNotFoundError,
  KnowledgeBaseSourceLimitExceededError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseWriteAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-write-access.service';
import { KnowledgeBasesConstants } from 'src/domain/knowledge-bases/domain/knowledge-bases.constants';
import { StartUrlCrawlCommand } from 'src/domain/sources/application/use-cases/start-url-crawl/start-url-crawl.command';
import { StartUrlCrawlUseCase } from 'src/domain/sources/application/use-cases/start-url-crawl/start-url-crawl.use-case';
import type { TextSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { AddUrlToKnowledgeBaseCommand } from './add-url-to-knowledge-base.command';

@Injectable()
export class AddUrlToKnowledgeBaseUseCase {
  private readonly logger = new Logger(AddUrlToKnowledgeBaseUseCase.name);

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly writeAccess: KnowledgeBaseWriteAccessService,
    private readonly startUrlCrawl: StartUrlCrawlUseCase,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(command: AddUrlToKnowledgeBaseCommand): Promise<TextSource> {
    this.logger.log(
      {
        knowledgeBaseId: command.knowledgeBaseId,
        url: command.url,
        maxDepth: command.maxDepth,
      },
      'Adding URL to knowledge base (async)',
    );
    await this.assertWriteAccessAndCapacity(command.knowledgeBaseId);
    const source = await this.startUrlCrawl.execute(
      new StartUrlCrawlCommand({
        url: command.url,
        maxDepth: command.maxDepth,
      }),
    );
    await this.repository.assignSourceToKnowledgeBase(
      source.id,
      command.knowledgeBaseId,
    );
    return source;
  }

  private async assertWriteAccessAndCapacity(
    knowledgeBaseId: AddUrlToKnowledgeBaseCommand['knowledgeBaseId'],
  ): Promise<void> {
    await this.txHost.withTransaction(async () => {
      const knowledgeBase = await this.repository.findById(knowledgeBaseId);
      if (!knowledgeBase) throw new KnowledgeBaseNotFoundError(knowledgeBaseId);
      await this.writeAccess.requireWrite(knowledgeBase);
      const sourceCount =
        await this.repository.countSourcesByKnowledgeBaseId(knowledgeBaseId);
      if (sourceCount >= KnowledgeBasesConstants.MAX_SOURCES) {
        throw new KnowledgeBaseSourceLimitExceededError(
          KnowledgeBasesConstants.MAX_SOURCES,
        );
      }
    });
  }
}
