import type { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { MarketplaceUnavailableError } from 'src/domain/marketplace/application/marketplace.errors';
import type { MarketplaceCatalogueEntry } from 'src/domain/marketplace/application/models/marketplace-catalogue-entry';
import type { ListMarketplaceCatalogueUseCase } from 'src/domain/marketplace/application/use-cases/list-marketplace-catalogue/list-marketplace-catalogue.use-case';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { MarketplaceSearchTool } from 'src/domain/tools/domain/tools/marketplace-search-tool.entity';
import { MarketplaceSearchToolHandler } from './marketplace-search-tool.handler';

const FRONTEND_BASE_URL = 'https://core.example.test';
const MARKETPLACE_URL = 'https://marketplace.example.test';

const financeSkill: MarketplaceCatalogueEntry = {
  type: 'skill',
  identifier: 'finance-clerk',
  name: 'Finanzsachbearbeitung',
  shortDescription: 'Hilft bei Haushaltsfragen',
  category: 'Finanzen',
  featured: true,
};

const councilIntegration: MarketplaceCatalogueEntry = {
  type: 'integration',
  identifier: 'council data',
  name: 'Ratsinformationssystem',
  shortDescription: 'Zugriff auf Beschlüsse',
  category: null,
  featured: false,
};

describe('MarketplaceSearchToolHandler', () => {
  const listCatalogue = jest.fn();
  const tool = new MarketplaceSearchTool();
  const context = { orgId: randomUUID(), threadId: randomUUID() };
  let handler: MarketplaceSearchToolHandler;

  beforeEach(() => {
    listCatalogue.mockReset();
    listCatalogue.mockResolvedValue([financeSkill, councilIntegration]);
    handler = new MarketplaceSearchToolHandler(
      { execute: listCatalogue } as unknown as ListMarketplaceCatalogueUseCase,
      { enabled: true, serviceUrl: MARKETPLACE_URL },
      {
        getOrThrow: jest.fn().mockReturnValue(FRONTEND_BASE_URL),
      } as unknown as ConfigService,
    );
  });

  it('returns the catalogue with typed entries, install links and the marketplace url', async () => {
    const result = JSON.parse(
      await handler.execute({ tool, input: {}, context }),
    ) as { marketplaceUrl: string; entries: Record<string, unknown>[] };

    expect(result.marketplaceUrl).toBe(MARKETPLACE_URL);
    expect(result.entries).toEqual([
      {
        ...financeSkill,
        installUrl: `${FRONTEND_BASE_URL}/install?skill=finance-clerk`,
      },
      {
        ...councilIntegration,
        installUrl: `${FRONTEND_BASE_URL}/install?integration=council%20data`,
      },
    ]);
  });

  it('asks for both types when the type is omitted or "all"', async () => {
    await handler.execute({ tool, input: {}, context });
    await handler.execute({ tool, input: { type: 'all' }, context });

    expect(listCatalogue).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: undefined }),
    );
    expect(listCatalogue).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: undefined }),
    );
  });

  it('passes a single requested type through to the catalogue query', async () => {
    await handler.execute({ tool, input: { type: 'integration' }, context });

    expect(listCatalogue).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'integration' }),
    );
  });

  it('tells the model plainly when the marketplace cannot be reached', async () => {
    listCatalogue.mockRejectedValue(new MarketplaceUnavailableError());

    const failure = await handler
      .execute({ tool, input: {}, context })
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ToolExecutionFailedError);
    expect((failure as ToolExecutionFailedError).exposeToLLM).toBe(true);
    expect((failure as Error).message).toContain(
      'marketplace cannot be reached right now',
    );
  });

  it('does not leak unexpected error details to the model', async () => {
    listCatalogue.mockRejectedValue(
      new Error('ECONNRESET at 10.0.0.7:5432 secret-token'),
    );

    const failure = await handler
      .execute({ tool, input: {}, context })
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ToolExecutionFailedError);
    expect((failure as ToolExecutionFailedError).exposeToLLM).toBe(true);
    expect((failure as Error).message).not.toContain('secret-token');
  });

  it('tells the model why invalid input was rejected, without calling the marketplace', async () => {
    const failure = await handler
      .execute({ tool, input: { type: 'agent' }, context })
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ToolExecutionFailedError);
    expect((failure as ToolExecutionFailedError).exposeToLLM).toBe(true);
    expect((failure as Error).message).toContain('type');
    expect(listCatalogue).not.toHaveBeenCalled();
  });
});
