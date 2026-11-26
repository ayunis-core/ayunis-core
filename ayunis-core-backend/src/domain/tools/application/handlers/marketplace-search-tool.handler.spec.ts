import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ContextService } from 'src/common/context/services/context.service';
import { appConfig } from 'src/config/app.config';
import { marketplaceConfig } from 'src/config/marketplace.config';
import { randomUUID } from 'crypto';
import { MarketplaceUnavailableError } from 'src/domain/marketplace/application/marketplace.errors';
import {
  aMarketplaceIntegrationListEntry,
  aMarketplaceRoutineCategory,
  aMarketplaceRoutineListEntry,
  aMarketplaceSkillCategory,
  aMarketplaceSkillListEntry,
  TEST_ROUTINE_CATEGORY_ID,
  TEST_SKILL_CATEGORY_ID,
} from 'src/domain/marketplace/application/testing/marketplace.fixtures';
import { ListMarketplaceIntegrationsUseCase } from 'src/domain/marketplace/application/use-cases/list-marketplace-integrations/list-marketplace-integrations.use-case';
import { ListMarketplaceRoutineCategoriesUseCase } from 'src/domain/marketplace/application/use-cases/list-marketplace-routine-categories/list-marketplace-routine-categories.use-case';
import { ListMarketplaceRoutinesUseCase } from 'src/domain/marketplace/application/use-cases/list-marketplace-routines/list-marketplace-routines.use-case';
import { ListMarketplaceSkillCategoriesUseCase } from 'src/domain/marketplace/application/use-cases/list-marketplace-skill-categories/list-marketplace-skill-categories.use-case';
import { ListMarketplaceSkillsUseCase } from 'src/domain/marketplace/application/use-cases/list-marketplace-skills/list-marketplace-skills.use-case';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { MarketplaceSearchTool } from 'src/domain/tools/domain/tools/marketplace-search-tool.entity';
import type { HasPermissionQuery } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.query';
import { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { MarketplaceSearchToolHandler } from './marketplace-search-tool.handler';

const FRONTEND_BASE_URL = 'https://core.example.test';
const MARKETPLACE_URL = 'https://marketplace.example.test';

describe('MarketplaceSearchToolHandler', () => {
  const listSkills = jest.fn();
  const listIntegrations = jest.fn();
  const listCategories = jest.fn();
  const listRoutines = jest.fn();
  const listRoutineCategories = jest.fn();
  const tool = new MarketplaceSearchTool();
  const context = { orgId: randomUUID(), threadId: randomUUID() };
  let handler: MarketplaceSearchToolHandler;
  let routinesEnabled: boolean;
  let signedInUser: Record<string, unknown> | null;
  let grantedPermissions: Permission[];

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
    listRoutines.mockReset().mockResolvedValue([]);
    listRoutineCategories.mockReset().mockResolvedValue([]);
    routinesEnabled = true;
    signedInUser = {
      userId: randomUUID(),
      orgId: context.orgId,
      role: UserRole.USER,
      systemRole: SystemRole.CUSTOMER,
    };
    grantedPermissions = [
      Permission.MANAGE_ROUTINES,
      Permission.INSTALL_MARKETPLACE_ROUTINES,
    ];
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
          provide: ListMarketplaceRoutinesUseCase,
          useValue: { execute: listRoutines },
        },
        {
          provide: ListMarketplaceRoutineCategoriesUseCase,
          useValue: { execute: listRoutineCategories },
        },
        {
          provide: HasPermissionUseCase,
          useValue: {
            execute: (query: HasPermissionQuery) =>
              Promise.resolve(grantedPermissions.includes(query.permission)),
          },
        },
        {
          provide: ContextService,
          useValue: { get: (key: string) => signedInUser?.[key] },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'features.routinesEnabled' ? routinesEnabled : undefined,
          },
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

  describe('routines', () => {
    beforeEach(() => {
      listRoutines.mockResolvedValue([
        aMarketplaceRoutineListEntry({
          identifier: 'council agenda',
          name: 'Neue Tagesordnungen',
          shortDescription: 'Meldet neue Sitzungen des Gemeinderats',
          routineCategoryId: TEST_ROUTINE_CATEGORY_ID,
          featured: true,
          schedule: { frequency: 'weekly', time: '07:30', weekdays: [1, 4] },
          internetAccess: 'allowlist',
          allowedDomains: ['ris.example.de'],
        }),
      ]);
      listRoutineCategories.mockResolvedValue([
        aMarketplaceRoutineCategory({ name: 'Bekanntmachungen' }),
      ]);
    });

    function entriesOf(result: string) {
      return (JSON.parse(result) as { entries: Record<string, unknown>[] })
        .entries;
    }

    it('lists routines with schedule, internet mode, category, install link and marketplace page', async () => {
      const entries = entriesOf(
        await handler.execute({ tool, input: { type: 'routine' }, context }),
      );

      expect(entries).toEqual([
        {
          type: 'routine',
          identifier: 'council agenda',
          name: 'Neue Tagesordnungen',
          shortDescription: 'Meldet neue Sitzungen des Gemeinderats',
          category: 'Bekanntmachungen',
          featured: true,
          schedule: { frequency: 'weekly', time: '07:30', weekdays: [1, 4] },
          internetAccess: 'allowlist',
          installUrl: `${FRONTEND_BASE_URL}/install?routine=council%20agenda`,
          marketplaceUrl: `${MARKETPLACE_URL}/routines/council%20agenda`,
        },
      ]);
      expect(listSkills).not.toHaveBeenCalled();
      expect(listIntegrations).not.toHaveBeenCalled();
    });

    it('lists skills, integrations and routines when the type is omitted or "all"', async () => {
      for (const input of [{}, { type: 'all' }]) {
        const entries = entriesOf(
          await handler.execute({ tool, input, context }),
        );

        expect(entries.map((entry) => entry.type)).toEqual([
          'skill',
          'skill',
          'integration',
          'routine',
        ]);
      }
    });

    it('keeps listing skills and integrations when only the routine catalogue fails', async () => {
      listRoutines.mockRejectedValue(new MarketplaceUnavailableError());

      const entries = entriesOf(
        await handler.execute({ tool, input: {}, context }),
      );

      expect(entries.map((entry) => entry.type)).toEqual([
        'skill',
        'skill',
        'integration',
      ]);
    });

    it('tells the model when the routines it asked for cannot be loaded', async () => {
      listRoutineCategories.mockRejectedValue(
        new MarketplaceUnavailableError(),
      );

      const failure = await handler
        .execute({ tool, input: { type: 'routine' }, context })
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(ToolExecutionFailedError);
      expect((failure as Error).message).toContain(
        'marketplace cannot be reached right now',
      );
    });

    it.each([
      [
        'routines are switched off',
        () => {
          routinesEnabled = false;
        },
      ],
      [
        'the role lacks manage_routines',
        () => {
          grantedPermissions = [Permission.INSTALL_MARKETPLACE_ROUTINES];
        },
      ],
      [
        'the role lacks install_marketplace_routines',
        () => {
          grantedPermissions = [Permission.MANAGE_ROUTINES];
        },
      ],
      [
        'no user is signed in',
        () => {
          signedInUser = null;
        },
      ],
    ])(
      'offers no routine install links when %s, and leaves skills and integrations alone',
      async (_case, withoutRoutineAccess) => {
        withoutRoutineAccess();

        const onlyRoutines = entriesOf(
          await handler.execute({ tool, input: { type: 'routine' }, context }),
        );
        const all = entriesOf(
          await handler.execute({ tool, input: {}, context }),
        );

        expect(onlyRoutines).toEqual([]);
        expect(all.map((entry) => entry.type)).toEqual([
          'skill',
          'skill',
          'integration',
        ]);
        expect(listRoutines).not.toHaveBeenCalled();
      },
    );
  });
});
