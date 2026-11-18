import { randomUUID, type UUID } from 'crypto';
import { ConnectorSyncAdapterRegistry } from 'src/domain/connectors/application/connector-sync-adapter.registry';
import {
  ConnectorSyncOutcome,
  type ConnectorChangesResult,
} from 'src/domain/connectors/application/models/connector-sync-results';
import type { ConnectorsRepository } from 'src/domain/connectors/application/ports/connectors.repository';
import type { ConnectorSyncAdapter } from 'src/domain/connectors/application/ports/connector-sync-adapter.port';
import { ConnectorSyncAccessService } from 'src/domain/connectors/application/services/connector-sync-access.service';
import { Connector } from 'src/domain/connectors/domain/connector.entity';
import { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';
import { ListConnectorChangesCommand } from './list-connector-changes.command';
import { ListConnectorChangesUseCase } from './list-connector-changes.use-case';

describe('ListConnectorChangesUseCase', () => {
  const orgId = randomUUID();
  const changes: ConnectorChangesResult = {
    outcome: ConnectorSyncOutcome.CHANGES,
    items: [],
    removedItemIds: [],
    cursor: 'delta-1',
    fullListing: true,
  };

  function listFor(
    connector: Connector | null,
    options: { withAdapter?: boolean; orgId?: UUID } = {},
  ) {
    const adapter = {
      product: ConnectorProduct.MICROSOFT_365,
      listChanges: jest.fn().mockResolvedValue(changes),
    };
    const connectors = {
      findById: () => Promise.resolve(connector),
    } as unknown as ConnectorsRepository;
    const useCase = new ListConnectorChangesUseCase(
      new ConnectorSyncAccessService(
        connectors,
        new ConnectorSyncAdapterRegistry(
          options.withAdapter === false
            ? []
            : [adapter as unknown as ConnectorSyncAdapter],
        ),
      ),
    );
    return useCase.execute(
      new ListConnectorChangesCommand({
        connectorId: connector?.id ?? randomUUID(),
        orgId: options.orgId ?? orgId,
        location: 'https://municipality.sharepoint.com/sites/bauamt',
        cursor: null,
      }),
    );
  }

  const setUp = () =>
    new Connector({
      orgId,
      product: ConnectorProduct.MICROSOFT_365,
      setup: { tenantId: randomUUID(), clientId: randomUUID() },
      encryptedCredentials: 'sealed',
    });

  it("lists through the product's adapter with the organization's set-up connector", async () => {
    await expect(listFor(setUp())).resolves.toEqual(changes);
  });

  it.each([
    ['is gone', () => listFor(null)],
    [
      'is no longer set up',
      () => listFor(new Connector({ ...setUp(), encryptedCredentials: null })),
    ],
    [
      'belongs to another organization',
      () => listFor(setUp(), { orgId: randomUUID() }),
    ],
    ['has no adapter', () => listFor(setUp(), { withAdapter: false })],
  ])('reports access lost when the connector %s', async (_case, list) => {
    await expect(list()).resolves.toEqual({
      outcome: ConnectorSyncOutcome.ACCESS_LOST,
    });
  });
});
