import { Test } from '@nestjs/testing';
import { appConfig } from 'src/config/app.config';
import { marketplaceConfig } from 'src/config/marketplace.config';
import { randomUUID } from 'crypto';
import { MarketplaceUnavailableError } from 'src/domain/marketplace/application/marketplace.errors';
import {
  aMarketplaceIntegrationListEntry,
  aMarketplaceSkillCategory,
  aMarketplaceSkillListEntry,
  TEST_SKILL_CATEGORY_ID,
} from 'src/domain/marketplace/application/testing/marketplace.fixtures';
import { ListMarketplaceIntegrationsUseCase } from 'src/domain/marketplace/application/use-cases/list-marketplace-integrations/list-marketplace-integrations.use-case';
import { ListMarketplaceSkillCategoriesUseCase } from 'src/domain/marketplace/application/use-cases/list-marketplace-skill-categories/list-marketplace-skill-categories.use-case';
import { ListMarketplaceSkillsUseCase } from 'src/domain/marketplace/application/use-cases/list-marketplace-skills/list-marketplace-skills.use-case';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { MarketplaceSearchTool } from 'src/domain/tools/domain/tools/marketplace-search-tool.entity';
import { MarketplaceSearchToolHandler } from './marketplace-search-tool.handler';

const FRONTEND_BASE_URL = 'https://core.example.test';
const MARKETPLACE_URL = 'https://marketplace.example.test';

describe('MarketplaceSearchToolHandler', () => {
  const listSkills = jest.fn();
  const listIntegrations = jest.fn();
  const listCategories = jest.fn();
  const tool = new MarketplaceSearchTool();
  const context = { orgId: randomUUID(), threadId: randomUUID() };
  let handler: MarketplaceSearchToolHandler;

  beforeEach(async () => {
    listSkills.mockReset().mockResolvedValue([
      aMarketplaceSkillListEntry({
        identifier: 'finance-clerk',
        name: 'Finanzsachbearbeitung',
        shortDescription: 'Hilft bei Haushaltsfragen',
        skillCategoryId: TEST_SKILL_CATEGORY_ID,
        featured: true,
      }),
      aMarketplaceSkillListEntry({
        identifier: 'minutes',
        name: 'Sitzungsprotokoll',
        shortDescription: 'Erstellt Protokolle',
        skillCategoryId: 'unknown-category',
      }),
    ]);
    listIntegrations.mockReset().mockResolvedValue([
      aMarketplaceIntegrationListEntry({
        identifier: 'council data',
        name: 'Ratsinformationssystem',
        shortDescription: 'Zugriff auf Beschlüsse',
      }),
    ]);
    listCategories
      .mockReset()
      .mockResolvedValue([aMarketplaceSkillCategory({ name: 'Finanzen' })]);
    const module = await Test.createTestingModule({
      providers: [
        MarketplaceSearchToolHandler,
        {
          provide: ListMarketplaceSkillsUseCase,
          useValue: { execute: listSkills },
        },
        {
          provide: ListMarketplaceIntegrationsUseCase,
          useValue: { execute: listIntegrations },
        },
        {
          provide: ListMarketplaceSkillCategoriesUseCase,
          useValue: { execute: listCategories },
        },
        {
          provide: marketplaceConfig.KEY,
          useValue: { enabled: true, serviceUrl: MARKETPLACE_URL },
        },
        {
          provide: appConfig.KEY,
          useValue: { frontend: { baseUrl: FRONTEND_BASE_URL } },
        },
      ],
    }).compile();
    handler = module.get(MarketplaceSearchToolHandler);
  });

  it('gives the model only what a recommendation needs: type, category name and install link', async () => {
    const result = JSON.parse(
      await handler.execute({ tool, input: {}, context }),
    ) as { marketplaceUrl: string; entries: Record<string, unknown>[] };

    expect(result.marketplaceUrl).toBe(MARKETPLACE_URL);
    expect(result.entries).toEqual([
      {
        type: 'skill',
        identifier: 'finance-clerk',
        name: 'Finanzsachbearbeitung',
        shortDescription: 'Hilft bei Haushaltsfragen',
        category: 'Finanzen',
        featured: true,
        installUrl: `${FRONTEND_BASE_URL}/install?skill=finance-clerk`,
      },
      {
        type: 'skill',
        identifier: 'minutes',
        name: 'Sitzungsprotokoll',
        shortDescription: 'Erstellt Protokolle',
        category: null,
        featured: false,
        installUrl: `${FRONTEND_BASE_URL}/install?skill=minutes`,
      },
      {
        type: 'integration',
        identifier: 'council data',
        name: 'Ratsinformationssystem',
        shortDescription: 'Zugriff auf Beschlüsse',
        category: null,
        featured: false,
        installUrl: `${FRONTEND_BASE_URL}/install?integration=council%20data`,
      },
    ]);
  });

  it('lists both types when the type is omitted or "all"', async () => {
    await handler.execute({ tool, input: {}, context });
    await handler.execute({ tool, input: { type: 'all' }, context });

    expect(listSkills).toHaveBeenCalledTimes(2);
    expect(listIntegrations).toHaveBeenCalledTimes(2);
  });

  it('skips the skill and category calls when only integrations are requested', async () => {
    const result = JSON.parse(
      await handler.execute({ tool, input: { type: 'integration' }, context }),
    ) as { entries: { type: string }[] };

    expect(result.entries.map((entry) => entry.type)).toEqual(['integration']);
    expect(listSkills).not.toHaveBeenCalled();
    expect(listCategories).not.toHaveBeenCalled();
  });

  it('skips the integration call when only skills are requested', async () => {
    const result = JSON.parse(
      await handler.execute({ tool, input: { type: 'skill' }, context }),
    ) as { entries: { type: string }[] };

    expect(result.entries.map((entry) => entry.type)).toEqual([
      'skill',
      'skill',
    ]);
    expect(listIntegrations).not.toHaveBeenCalled();
  });

  it('tells the model plainly when the marketplace cannot be reached', async () => {
    listSkills.mockRejectedValue(new MarketplaceUnavailableError());

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
    listIntegrations.mockRejectedValue(
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
    expect(listSkills).not.toHaveBeenCalled();
    expect(listIntegrations).not.toHaveBeenCalled();
  });
});
