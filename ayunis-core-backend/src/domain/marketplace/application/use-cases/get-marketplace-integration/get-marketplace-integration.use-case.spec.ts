import { GetMarketplaceIntegrationUseCase } from './get-marketplace-integration.use-case';
import { GetMarketplaceIntegrationQuery } from './get-marketplace-integration.query';
import type { MarketplaceClient } from '../../ports/marketplace-client.port';
import {
  MarketplaceIntegrationNotFoundError,
  MarketplaceUnavailableError,
} from '../../marketplace.errors';
import type { IntegrationResponseDto } from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';

describe('GetMarketplaceIntegrationUseCase', () => {
  let useCase: GetMarketplaceIntegrationUseCase;
  let marketplaceClient: jest.Mocked<MarketplaceClient>;

  const mockIntegration: IntegrationResponseDto = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    identifier: 'oparl-council-data',
    name: 'OParl Council Data',
    shortDescription: 'Access municipal council data via OParl',
    description:
      'Access municipal council data via the OParl standard interface',
    iconUrl: 'https://marketplace.ayunis.de/icons/oparl.png',
    serverUrl: 'https://mcp.ayunis.de/oparl',
    featured: false,
    preInstalled: false,
    configSchema: {
      authType: 'NO_AUTH',
      orgFields: [
        {
          key: 'oparlEndpointUrl',
          type: 'url' as const,
          label: 'OParl Endpoint URL',
          headerName: 'X-Oparl-Endpoint-Url',
          prefix: null,
          required: true,
          help: "Your municipality's OParl system endpoint URL",
          value: null,
        },
      ],
      userFields: [],
    },
    published: true,
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-02-10T14:30:00.000Z',
  };

  beforeEach(() => {
    marketplaceClient = {
      getSkillByIdentifier: jest.fn(),
      getPreInstalledSkills: jest.fn(),
      getIntegrationByIdentifier: jest.fn(),
    } as jest.Mocked<MarketplaceClient>;

    useCase = new GetMarketplaceIntegrationUseCase(marketplaceClient);
  });

  it('should return integration details when integration is found', async () => {
    marketplaceClient.getIntegrationByIdentifier.mockResolvedValue(
      mockIntegration,
    );

    const result = await useCase.execute(
      new GetMarketplaceIntegrationQuery('oparl-council-data'),
    );

    expect(result).toEqual(mockIntegration);
    expect(marketplaceClient.getIntegrationByIdentifier).toHaveBeenCalledWith(
      'oparl-council-data',
    );
  });

  it('should throw MarketplaceIntegrationNotFoundError when integration is not found', async () => {
    marketplaceClient.getIntegrationByIdentifier.mockResolvedValue(null);

    await expect(
      useCase.execute(
        new GetMarketplaceIntegrationQuery('nonexistent-integration'),
      ),
    ).rejects.toThrow(MarketplaceIntegrationNotFoundError);
  });

  it('should throw MarketplaceUnavailableError when marketplace service fails', async () => {
    marketplaceClient.getIntegrationByIdentifier.mockRejectedValue(
      new Error('Connection refused'),
    );

    await expect(
      useCase.execute(new GetMarketplaceIntegrationQuery('oparl-council-data')),
    ).rejects.toThrow(MarketplaceUnavailableError);
  });

  it('should re-throw application errors without wrapping', async () => {
    const notFoundError = new MarketplaceIntegrationNotFoundError(
      'oparl-council-data',
    );
    marketplaceClient.getIntegrationByIdentifier.mockRejectedValue(
      notFoundError,
    );

    await expect(
      useCase.execute(new GetMarketplaceIntegrationQuery('oparl-council-data')),
    ).rejects.toThrow(MarketplaceIntegrationNotFoundError);
  });
});
