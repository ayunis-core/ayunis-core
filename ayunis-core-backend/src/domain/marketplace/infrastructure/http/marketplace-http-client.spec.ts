import { MarketplaceUnavailableError } from 'src/domain/marketplace/application/marketplace.errors';
import { MarketplaceHttpError } from 'src/common/clients/marketplace/client';
import { getAyunisMarketplaceAPI } from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI';
import { MarketplaceHttpClient } from './marketplace-http-client';

jest.mock(
  'src/common/clients/marketplace/generated/ayunisMarketplaceAPI',
  () => ({ getAyunisMarketplaceAPI: jest.fn() }),
);

describe('MarketplaceHttpClient', () => {
  const getIntegrationByIdentifier = jest.fn();

  beforeEach(() => {
    jest.mocked(getAyunisMarketplaceAPI).mockReturnValue({
      publicIntegrationsControllerGetByIdentifier: getIntegrationByIdentifier,
    } as unknown as ReturnType<typeof getAyunisMarketplaceAPI>);
    getIntegrationByIdentifier.mockReset();
  });

  it('classifies marketplace dependency failures as unavailable', async () => {
    getIntegrationByIdentifier.mockRejectedValue(
      new MarketplaceHttpError('Request failed with status code 502', 502),
    );
    const client = new MarketplaceHttpClient();

    await expect(
      client.getIntegrationByIdentifier('oparl-council-data'),
    ).rejects.toThrow(MarketplaceUnavailableError);
  });
});
