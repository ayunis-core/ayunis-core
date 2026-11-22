import { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';
import { ConnectorStatus } from 'src/domain/connectors/domain/connector-status.enum';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseSyncDisabledError } from 'src/domain/knowledge-base-sync/application/knowledge-base-sync.errors';
import {
  CONNECTOR_ID,
  createSyncHarness,
  featureConfig,
  KNOWLEDGE_BASE_ID,
  ORG_ID,
} from 'src/domain/knowledge-base-sync/application/testing/knowledge-base-sync.fixtures';
import { SyncedFileSkipReason } from 'src/domain/knowledge-base-sync/domain/synced-file-skip-reason.enum';
import { ListSyncedLocationsQuery } from './list-synced-locations.query';
import { ListSyncedLocationsUseCase } from './list-synced-locations.use-case';

describe('ListSyncedLocationsUseCase', () => {
  function listing(
    harness: ReturnType<typeof createSyncHarness>,
    options: {
      readable?: boolean;
      connectorStatus?: ConnectorStatus;
      connectorsEnabled?: boolean;
    } = {},
  ) {
    return new ListSyncedLocationsUseCase(
      harness.repository,
      {
        execute: () =>
          options.readable === false
            ? Promise.reject(new KnowledgeBaseNotFoundError(KNOWLEDGE_BASE_ID))
            : Promise.resolve({ id: KNOWLEDGE_BASE_ID, orgId: ORG_ID }),
      } as never,
      {
        execute: () =>
          Promise.resolve([
            {
              product: ConnectorProduct.MICROSOFT_365,
              status: options.connectorStatus ?? ConnectorStatus.SET_UP,
              connectorId: CONNECTOR_ID,
            },
          ]),
      } as never,
      featureConfig(options.connectorsEnabled ?? true),
    ).execute(new ListSyncedLocationsQuery(KNOWLEDGE_BASE_ID));
  }

  it('shows a reader each location with what its files amount to, and the products that can be added', async () => {
    const harness = createSyncHarness();
    harness.knowledgeBase.upload(499);
    harness.system.add('Satzungen/Hundesteuer.pdf');
    harness.system.add('Satzungen/Zweitwohnungsteuer.pdf');
    harness.system.add('Bilder/Ortsplan.jpg');
    await harness.sync();

    await expect(listing(harness)).resolves.toEqual({
      locations: [
        {
          location: expect.objectContaining({ id: harness.location.id }),
          product: ConnectorProduct.MICROSOFT_365,
          files: {
            documents: 1,
            failed: 0,
            awaitingCapacity: 1,
            skippedCount: 1,
            skipped: [
              {
                name: 'Ortsplan.jpg',
                path: 'Bilder/Ortsplan.jpg',
                reason: SyncedFileSkipReason.UNSUPPORTED_TYPE,
              },
            ],
          },
        },
      ],
      availableProducts: [ConnectorProduct.MICROSOFT_365],
    });
  });

  it('keeps showing the locations of a connector that is no longer set up, but offers no new ones', async () => {
    const harness = createSyncHarness();

    const overview = await listing(harness, {
      connectorStatus: ConnectorStatus.NOT_SET_UP,
    });

    expect(overview.locations).toHaveLength(1);
    expect(overview.availableProducts).toEqual([]);
  });

  it('shows nothing to a user who may not read the knowledge base', async () => {
    await expect(
      listing(createSyncHarness(), { readable: false }),
    ).rejects.toBeInstanceOf(KnowledgeBaseNotFoundError);
  });

  it('is not available while connectors are switched off', async () => {
    await expect(
      listing(createSyncHarness(), { connectorsEnabled: false }),
    ).rejects.toBeInstanceOf(KnowledgeBaseSyncDisabledError);
  });
});
