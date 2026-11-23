import { Injectable, Logger } from '@nestjs/common';
import { isURL } from 'class-validator';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AssertCrawlDomainAccessCommand } from 'src/domain/crawl-domain-grants/application/use-cases/assert-crawl-domain-access/assert-crawl-domain-access.command';
import { AssertCrawlDomainAccessUseCase } from 'src/domain/crawl-domain-grants/application/use-cases/assert-crawl-domain-access/assert-crawl-domain-access.use-case';
import { AssertKnowledgeBaseWriteAccessQuery } from 'src/domain/knowledge-bases/application/use-cases/assert-knowledge-base-write-access/assert-knowledge-base-write-access.query';
import { AssertKnowledgeBaseWriteAccessUseCase } from 'src/domain/knowledge-bases/application/use-cases/assert-knowledge-base-write-access/assert-knowledge-base-write-access.use-case';
import {
  InvalidSyncedLocationError,
  UnexpectedKnowledgeBaseSyncError,
} from 'src/domain/knowledge-base-sync/application/knowledge-base-sync.errors';
import { SyncedLocationRegistrar } from 'src/domain/knowledge-base-sync/application/services/synced-location-registrar.service';
import {
  WEB_SYNC_MAX_DEPTH,
  WebSyncedLocation,
} from 'src/domain/knowledge-base-sync/domain/web-synced-location.entity';
import { AddWebSyncedLocationCommand } from './add-web-synced-location.command';

/**
 * Adds a website to a knowledge base the current user may change, as a
 * location without a connection, and queues its first sync, which crawls
 * it. The URL is held to the rules of URL sources: an http(s) URL with a
 * public host name, and a host bound to another organization by a
 * crawl-domain grant is refused (404).
 */
@Injectable()
export class AddWebSyncedLocationUseCase {
  private readonly logger = new Logger(AddWebSyncedLocationUseCase.name);

  constructor(
    private readonly writeAccess: AssertKnowledgeBaseWriteAccessUseCase,
    private readonly assertCrawlDomainAccess: AssertCrawlDomainAccessUseCase,
    private readonly registrar: SyncedLocationRegistrar,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseSyncError)
  async execute(
    command: AddWebSyncedLocationCommand,
  ): Promise<WebSyncedLocation> {
    this.logger.log(
      { knowledgeBaseId: command.knowledgeBaseId, depth: command.depth },
      'execute',
    );
    const url = websiteUrl(command.url);
    if (
      !Number.isInteger(command.depth) ||
      command.depth < 0 ||
      command.depth > WEB_SYNC_MAX_DEPTH
    )
      throw new InvalidSyncedLocationError(
        `depth must be 0 to ${WEB_SYNC_MAX_DEPTH}`,
      );
    const knowledgeBase = await this.writeAccess.execute(
      new AssertKnowledgeBaseWriteAccessQuery(command.knowledgeBaseId),
    );
    await this.assertCrawlDomainAccess.execute(
      new AssertCrawlDomainAccessCommand(url, knowledgeBase.orgId),
    );
    return this.registrar.register(
      new WebSyncedLocation({
        orgId: knowledgeBase.orgId,
        knowledgeBaseId: knowledgeBase.id,
        location: url,
        depth: command.depth,
      }),
    );
  }
}

/** The URL as the crawler requests it, so a duplicate is found as such. */
function websiteUrl(value: string): string {
  const trimmed = value.trim();
  if (!isURL(trimmed, { require_protocol: true, protocols: ['http', 'https'] }))
    throw new InvalidSyncedLocationError('not an http(s) URL');
  const url = new URL(trimmed);
  url.hash = '';
  return url.toString();
}
