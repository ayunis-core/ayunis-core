import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { FeatureFlag } from 'src/config/features.config';
import { ListConnectorsUseCase } from 'src/domain/connectors/application/use-cases/list-connectors/list-connectors.use-case';
import { ConnectorStatus } from 'src/domain/connectors/domain/connector-status.enum';
import { AssertKnowledgeBaseReadAccessQuery } from 'src/domain/knowledge-bases/application/use-cases/assert-knowledge-base-read-access/assert-knowledge-base-read-access.query';
import { AssertKnowledgeBaseReadAccessUseCase } from 'src/domain/knowledge-bases/application/use-cases/assert-knowledge-base-read-access/assert-knowledge-base-read-access.use-case';
import {
  KnowledgeBaseSyncDisabledError,
  UnexpectedKnowledgeBaseSyncError,
} from 'src/domain/knowledge-base-sync/application/knowledge-base-sync.errors';
import type { KnowledgeBaseSyncOverview } from 'src/domain/knowledge-base-sync/application/models/knowledge-base-sync-overview';
import { EMPTY_SYNCED_FILES_SUMMARY } from 'src/domain/knowledge-base-sync/application/models/synced-files-summary';
import { SyncedLocationsRepository } from 'src/domain/knowledge-base-sync/application/ports/synced-locations.repository';
import { ListSyncedLocationsQuery } from './list-synced-locations.query';

/** Enough to see why files are missing; the rest is counted. */
const SKIPPED_FILES_SHOWN = 100;

/**
 * The locations a knowledge base syncs, with their state and what their
 * files amount to, for a user who may read it; and the products whose
 * locations can be added to it.
 */
@Injectable()
export class ListSyncedLocationsUseCase {
  private readonly logger = new Logger(ListSyncedLocationsUseCase.name);

  constructor(
    private readonly repository: SyncedLocationsRepository,
    private readonly readAccess: AssertKnowledgeBaseReadAccessUseCase,
    private readonly listConnectors: ListConnectorsUseCase,
    private readonly configService: ConfigService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseSyncError)
  async execute(
    query: ListSyncedLocationsQuery,
  ): Promise<KnowledgeBaseSyncOverview> {
    this.logger.log({ knowledgeBaseId: query.knowledgeBaseId }, 'execute');
    if (!this.configService.get<boolean>(`features.${FeatureFlag.Connectors}`))
      throw new KnowledgeBaseSyncDisabledError();
    const knowledgeBase = await this.readAccess.execute(
      new AssertKnowledgeBaseReadAccessQuery(query.knowledgeBaseId),
    );
    const [locations, connectors] = await Promise.all([
      this.repository.findByKnowledgeBaseId(knowledgeBase.id),
      this.listConnectors.execute(),
    ]);
    const summaries = await this.repository.summarizeFiles(
      locations.map(({ id }) => id),
      SKIPPED_FILES_SHOWN,
    );
    const productOf = new Map(
      connectors.map(({ connectorId, product }) => [connectorId, product]),
    );
    return {
      locations: locations.flatMap((location) => {
        const product = productOf.get(location.connectorId);
        // Always listed: a location's connector is its organization's own.
        if (!product) return [];
        const files = summaries.get(location.id) ?? EMPTY_SYNCED_FILES_SUMMARY;
        return [{ location, product, files }];
      }),
      availableProducts: connectors
        .filter(({ status }) => status === ConnectorStatus.SET_UP)
        .map(({ product }) => product),
    };
  }
}
