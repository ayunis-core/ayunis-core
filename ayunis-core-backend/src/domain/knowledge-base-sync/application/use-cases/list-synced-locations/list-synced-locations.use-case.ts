import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ListConnectorsUseCase } from 'src/domain/connectors/application/use-cases/list-connectors/list-connectors.use-case';
import { ConnectorStatus } from 'src/domain/connectors/domain/connector-status.enum';
import { AssertKnowledgeBaseReadAccessQuery } from 'src/domain/knowledge-bases/application/use-cases/assert-knowledge-base-read-access/assert-knowledge-base-read-access.query';
import { AssertKnowledgeBaseReadAccessUseCase } from 'src/domain/knowledge-bases/application/use-cases/assert-knowledge-base-read-access/assert-knowledge-base-read-access.use-case';
import { UnexpectedKnowledgeBaseSyncError } from 'src/domain/knowledge-base-sync/application/knowledge-base-sync.errors';
import type {
  KnowledgeBaseSyncOverview,
  SyncedLocationOverview,
} from 'src/domain/knowledge-base-sync/application/models/knowledge-base-sync-overview';
import { EMPTY_SYNCED_FILES_SUMMARY } from 'src/domain/knowledge-base-sync/application/models/synced-files-summary';
import { SyncedLocationsRepository } from 'src/domain/knowledge-base-sync/application/ports/synced-locations.repository';
import { EnabledSyncProviders } from 'src/domain/knowledge-base-sync/application/services/enabled-sync-providers.service';
import { ConnectorSyncedLocation } from 'src/domain/knowledge-base-sync/domain/connector-synced-location.entity';
import { SyncedLocationProvider } from 'src/domain/knowledge-base-sync/domain/synced-location-provider.enum';
import { ListSyncedLocationsQuery } from './list-synced-locations.query';

/** Enough to see why files are missing; the rest is counted. */
const SKIPPED_FILES_SHOWN = 100;

/**
 * The locations a knowledge base syncs, with their state, the product of
 * those synced through a connector and what their files amount to, for a
 * user who may read it; and the products whose locations can be added to it.
 * Locations of a switched-off provider are left out.
 */
@Injectable()
export class ListSyncedLocationsUseCase {
  private readonly logger = new Logger(ListSyncedLocationsUseCase.name);

  constructor(
    private readonly repository: SyncedLocationsRepository,
    private readonly readAccess: AssertKnowledgeBaseReadAccessUseCase,
    private readonly listConnectors: ListConnectorsUseCase,
    private readonly providers: EnabledSyncProviders,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseSyncError)
  async execute(
    query: ListSyncedLocationsQuery,
  ): Promise<KnowledgeBaseSyncOverview> {
    this.logger.log({ knowledgeBaseId: query.knowledgeBaseId }, 'execute');
    const knowledgeBase = await this.readAccess.execute(
      new AssertKnowledgeBaseReadAccessQuery(query.knowledgeBaseId),
    );
    const [all, connectors] = await Promise.all([
      this.repository.findByKnowledgeBaseId(knowledgeBase.id),
      this.providers.includes(SyncedLocationProvider.CONNECTOR)
        ? this.listConnectors.execute()
        : [],
    ]);
    const locations = all.filter(({ provider }) =>
      this.providers.includes(provider),
    );
    const summaries = await this.repository.summarizeFiles(
      locations.map(({ id }) => id),
      SKIPPED_FILES_SHOWN,
    );
    const productOf = new Map(
      connectors.map(({ connectorId, product }) => [connectorId, product]),
    );
    return {
      locations: locations.flatMap((location): SyncedLocationOverview[] => {
        const files = summaries.get(location.id) ?? EMPTY_SYNCED_FILES_SUMMARY;
        if (!(location instanceof ConnectorSyncedLocation))
          return [{ location, product: null, files }];
        const product = productOf.get(location.connectorId);
        // Always listed: a location's connector is its organization's own.
        if (!product) return [];
        return [{ location, product, files }];
      }),
      availableProducts: connectors
        .filter(({ status }) => status === ConnectorStatus.SET_UP)
        .map(({ product }) => product),
    };
  }
}
