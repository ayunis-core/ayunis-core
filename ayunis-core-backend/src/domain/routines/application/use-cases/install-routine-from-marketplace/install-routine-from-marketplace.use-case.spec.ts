import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { RoutineResponseDto as MarketplaceRoutine } from 'src/common/clients/marketplace/generated/ayunisMarketplaceAPI.schemas';
import { ContextService } from 'src/common/context/services/context.service';
import { createMockContextService } from 'src/common/context/testing/context.fixtures';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { GetMarketplaceRoutineUseCase } from 'src/domain/marketplace/application/use-cases/get-marketplace-routine/get-marketplace-routine.use-case';
import { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { RoutinesRepository } from 'src/domain/routines/application/ports/routines.repository';
import { RoutineModelService } from 'src/domain/routines/application/services/routine-model.service';
import {
  RoutineInvalidAllowedDomainsError,
  RoutineInvalidMarketplaceEntryError,
  RoutineInvalidScheduleError,
} from 'src/domain/routines/application/routines.errors';
import { MarketplaceRoutineInstalledEvent } from 'src/domain/routines/application/events/marketplace-routine-installed.event';
import { CreateRoutineUseCase } from 'src/domain/routines/application/use-cases/create-routine/create-routine.use-case';
import {
  TEST_ORG_ID,
  TEST_USER_ID,
  createMockRoutinesRepository,
} from 'src/domain/routines/application/testing/routine.fixtures';
import { RoutineInternetAccess } from 'src/domain/routines/domain/routine-internet-access';
import { RoutineFrequency } from 'src/domain/routines/domain/routine-frequency';
import { InstallRoutineFromMarketplaceCommand } from './install-routine-from-marketplace.command';
import { InstallRoutineFromMarketplaceUseCase } from './install-routine-from-marketplace.use-case';

function aMarketplaceRoutine(
  overrides: Partial<MarketplaceRoutine> = {},
): MarketplaceRoutine {
  return {
    id: 'd0000000-0000-4000-8000-000000000001',
    identifier: 'amtsblatt-nrw',
    name: 'Amtsblatt NRW',
    shortDescription: 'Neue Bekanntmachungen im Amtsblatt',
    description: null,
    routineCategoryId: null,
    iconName: 'newspaper',
    featured: false,
    published: true,
    schedule: { frequency: 'weekly', time: '07:30', weekdays: [1, 4] },
    internetAccess: 'allowlist',
    allowedDomains: ['https://Recht.NRW.de/amtsblatt'],
    useCases: [],
    benefits: [],
    exampleNotification: null,
    providerName: null,
    providerLogoUrl: null,
    providerWebsiteUrl: null,
    metaTitle: null,
    metaDescription: null,
    installCount: 0,
    createdAt: '2026-11-01T00:00:00.000Z',
    prompt: 'Fasse die neuen Bekanntmachungen im Amtsblatt zusammen.',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('InstallRoutineFromMarketplaceUseCase', () => {
  let useCase: InstallRoutineFromMarketplaceUseCase;
  let repository: jest.Mocked<RoutinesRepository>;
  const getMarketplaceRoutine = { execute: jest.fn() };
  const hasPermission = { execute: jest.fn() };
  const routineModelService = { select: jest.fn() };
  const eventEmitter = { emitAsync: jest.fn() };

  const install = () =>
    useCase.execute(new InstallRoutineFromMarketplaceCommand('amtsblatt-nrw'));

  beforeEach(async () => {
    jest.resetAllMocks();
    repository = createMockRoutinesRepository();
    getMarketplaceRoutine.execute.mockResolvedValue(aMarketplaceRoutine());
    hasPermission.execute.mockResolvedValue(true);
    routineModelService.select.mockResolvedValue({ modelId: null, mode: null });
    eventEmitter.emitAsync.mockResolvedValue([]);
    const module = await Test.createTestingModule({
      providers: [
        InstallRoutineFromMarketplaceUseCase,
        CreateRoutineUseCase,
        { provide: RoutinesRepository, useValue: repository },
        { provide: RoutineModelService, useValue: routineModelService },
        {
          provide: GetMarketplaceRoutineUseCase,
          useValue: getMarketplaceRoutine,
        },
        { provide: HasPermissionUseCase, useValue: hasPermission },
        { provide: ContextService, useValue: createMockContextService() },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();
    useCase = module.get(InstallRoutineFromMarketplaceUseCase);
  });

  it("creates the caller's switched-on copy of the entry with the default model", async () => {
    const routine = await install();

    expect(routine).toMatchObject({
      userId: TEST_USER_ID,
      orgId: TEST_ORG_ID,
      name: 'Amtsblatt NRW',
      prompt: 'Fasse die neuen Bekanntmachungen im Amtsblatt zusammen.',
      modelId: null,
      schedule: {
        frequency: RoutineFrequency.WEEKLY,
        time: '07:30',
        weekdays: [1, 4],
      },
      internetAccess: RoutineInternetAccess.ALLOWLIST,
      allowedDomains: ['recht.nrw.de'],
      mcpIntegrationIds: [],
      knowledgeBaseIds: [],
      enabled: true,
      marketplaceIdentifier: 'amtsblatt-nrw',
    });
    expect(routine.nextRunAt).toBeInstanceOf(Date);
    expect(routineModelService.select).toHaveBeenCalledWith({
      modelId: undefined,
      mode: undefined,
    });
    expect(repository.create).toHaveBeenCalledWith(routine);
  });

  it('reports the install for metrics', async () => {
    await install();

    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      MarketplaceRoutineInstalledEvent.EVENT_NAME,
      new MarketplaceRoutineInstalledEvent(
        TEST_USER_ID,
        TEST_ORG_ID,
        'amtsblatt-nrw',
      ),
    );
  });

  it('refuses a user without install_marketplace_routines before asking the marketplace', async () => {
    hasPermission.execute.mockResolvedValue(false);

    await expect(install()).rejects.toThrow(UnauthorizedAccessError);

    expect(hasPermission.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        permission: Permission.INSTALL_MARKETPLACE_ROUTINES,
      }),
    );
    expect(getMarketplaceRoutine.execute).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it.each([
    [
      'an IP address as allowed domain',
      // eslint-disable-next-line sonarjs/no-hardcoded-ip -- the rejected entry under test
      { allowedDomains: ['192.168.0.1'] },
      RoutineInvalidAllowedDomainsError,
    ],
    [
      'the allowlist mode without domains',
      { allowedDomains: [] },
      RoutineInvalidAllowedDomainsError,
    ],
    [
      'a month day on a weekly schedule',
      {
        schedule: {
          frequency: 'weekly' as const,
          time: '07:30',
          weekdays: [1],
          monthDay: 3,
        },
      },
      RoutineInvalidScheduleError,
    ],
    [
      'a name longer than Ayunis Core allows',
      { name: 'A'.repeat(101) },
      RoutineInvalidMarketplaceEntryError,
    ],
    ['a blank prompt', { prompt: '   ' }, RoutineInvalidMarketplaceEntryError],
    [
      'an unknown internet mode',
      {
        internetAccess: 'intranet' as MarketplaceRoutine['internetAccess'],
      },
      RoutineInvalidMarketplaceEntryError,
    ],
  ])('does not install an entry with %s', async (_, overrides, error) => {
    getMarketplaceRoutine.execute.mockResolvedValue(
      aMarketplaceRoutine(overrides),
    );

    await expect(install()).rejects.toThrow(error);

    expect(repository.create).not.toHaveBeenCalled();
    expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
  });
});
