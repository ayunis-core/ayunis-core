import {
  MarketplaceUnavailableError,
  UnexpectedMarketplaceError,
} from 'src/domain/marketplace/application/marketplace.errors';
import {
  aMarketplaceIntegrationListEntry,
  createMockMarketplaceClient,
} from 'src/domain/marketplace/application/testing/marketplace.fixtures';
import { ListMarketplaceIntegrationsUseCase } from './list-marketplace-integrations.use-case';

describe('ListMarketplaceIntegrationsUseCase', () => {
  let marketplaceClient: ReturnType<typeof createMockMarketplaceClient>;
  let useCase: ListMarketplaceIntegrationsUseCase;

  beforeEach(() => {
    marketplaceClient = createMockMarketplaceClient();
    useCase = new ListMarketplaceIntegrationsUseCase(marketplaceClient);
  });

  it('lists featured integrations before the rest and sorts the rest by name', async () => {
    marketplaceClient.listIntegrations.mockResolvedValue([
      aMarketplaceIntegrationListEntry({
        identifier: 'weather',
        name: 'Wetter',
      }),
      aMarketplaceIntegrationListEntry({
        identifier: 'council-data',
        name: 'Ratsinformationssystem',
      }),
      aMarketplaceIntegrationListEntry({
        identifier: 'dms',
        name: 'Dokumentenmanagement',
        featured: true,
      }),
    ]);

    const integrations = await useCase.execute();

    expect(integrations.map((entry) => entry.identifier)).toEqual([
      'dms',
      'council-data',
      'weather',
    ]);
  });

  it('propagates marketplace unavailability unchanged', async () => {
    marketplaceClient.listIntegrations.mockRejectedValue(
      new MarketplaceUnavailableError(),
    );

    await expect(useCase.execute()).rejects.toBeInstanceOf(
      MarketplaceUnavailableError,
    );
  });

  it('wraps unexpected failures in the module error', async () => {
    marketplaceClient.listIntegrations.mockRejectedValue(new Error('boom'));

    await expect(useCase.execute()).rejects.toBeInstanceOf(
      UnexpectedMarketplaceError,
    );
  });
});
