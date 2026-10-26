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
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { CreateProcessingUrlSourceUseCase } from 'src/domain/sources/application/use-cases/create-processing-url-source/create-processing-url-source.use-case';
import { CreateProcessingUrlSourceCommand } from 'src/domain/sources/application/use-cases/create-processing-url-source/create-processing-url-source.command';
import { EnqueueUrlCrawlUseCase } from 'src/domain/sources/application/use-cases/enqueue-url-crawl/enqueue-url-crawl.use-case';
import { EnqueueUrlCrawlCommand } from 'src/domain/sources/application/use-cases/enqueue-url-crawl/enqueue-url-crawl.command';
import { MarkSourceFailedUseCase } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.use-case';
import { MarkSourceFailedCommand } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.command';
import type { TextSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { AddUrlToKnowledgeBaseCommand } from './add-url-to-knowledge-base.command';

@Injectable()
export class AddUrlToKnowledgeBaseUseCase {
  private readonly logger = new Logger(AddUrlToKnowledgeBaseUseCase.name);

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly writeAccess: KnowledgeBaseWriteAccessService,
    private readonly createSource: CreateProcessingUrlSourceUseCase,
    private readonly enqueue: EnqueueUrlCrawlUseCase,
    private readonly markFailed: MarkSourceFailedUseCase,
    private readonly context: ContextService,
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
    const { orgId, userId } = getRequiredUserContext(this.context);
    const source = await this.createWithinCapacity(command);
    try {
      await this.enqueue.execute(
        new EnqueueUrlCrawlCommand({
          sourceId: source.id,
          orgId,
          userId,
          rootUrl: source.url,
          maxDepth: source.maxDepth,
        }),
      );
    } catch (error) {
      await this.markEnqueueFailed(source.id);
      throw error;
    }
    return source;
  }

  private async createWithinCapacity(command: AddUrlToKnowledgeBaseCommand) {
    const { knowledgeBaseId } = command;
    return this.txHost.withTransaction(async () => {
      const knowledgeBase = await this.repository.findById(knowledgeBaseId, {
        lock: true,
      });
      if (!knowledgeBase) throw new KnowledgeBaseNotFoundError(knowledgeBaseId);
      await this.writeAccess.requireWrite(knowledgeBase);
      const sourceCount =
        await this.repository.countSourcesByKnowledgeBaseId(knowledgeBaseId);
      if (sourceCount >= KnowledgeBasesConstants.MAX_SOURCES)
        throw new KnowledgeBaseSourceLimitExceededError(
          KnowledgeBasesConstants.MAX_SOURCES,
        );
      return this.createSource.execute(
        new CreateProcessingUrlSourceCommand({
          knowledgeBaseId,
          url: command.url,
          maxDepth: command.maxDepth,
        }),
      );
    });
  }

  private async markEnqueueFailed(sourceId: TextSource['id']): Promise<void> {
    try {
      await this.markFailed.execute(
        new MarkSourceFailedCommand({
          sourceId,
          errorMessage: 'Failed to enqueue crawl job',
        }),
      );
    } catch (error) {
      this.logger.error(
        { sourceId, error },
        'Failed to mark URL source as failed',
      );
    }
  }
}
