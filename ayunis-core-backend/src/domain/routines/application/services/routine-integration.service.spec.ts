import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { ListAvailableMcpIntegrationsUseCase } from 'src/domain/mcp/application/use-cases/list-available-mcp-integrations/list-available-mcp-integrations.use-case';
import { DiscoverMcpCapabilitiesUseCase } from 'src/domain/mcp/application/use-cases/discover-mcp-capabilities/discover-mcp-capabilities.use-case';
import { McpConnectionFailedError } from 'src/domain/mcp/application/mcp.errors';
import { RoutineIntegrationUnavailableError } from 'src/domain/routines/application/routines.errors';
import { aRoutine } from 'src/domain/routines/application/testing/routine.fixtures';
import { RoutineIntegrationService } from './routine-integration.service';

const TICKETS = '88888888-8888-4888-8888-888888888888' as UUID;
const CALENDAR = '99999999-9999-4999-8999-999999999999' as UUID;
const NOT_CONNECTED = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' as UUID;
const DISABLED = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' as UUID;

describe('RoutineIntegrationService', () => {
  let service: RoutineIntegrationService;
  const listAvailable = { execute: jest.fn() };
  const discover = { execute: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    listAvailable.execute.mockResolvedValue([
      { integration: { id: TICKETS }, userAuthorized: true },
      { integration: { id: CALENDAR }, userAuthorized: true },
      { integration: { id: NOT_CONNECTED }, userAuthorized: false },
    ]);
    discover.execute.mockResolvedValue({ tools: [], resources: [] });
    const module = await Test.createTestingModule({
      providers: [
        RoutineIntegrationService,
        {
          provide: ListAvailableMcpIntegrationsUseCase,
          useValue: listAvailable,
        },
        { provide: DiscoverMcpCapabilitiesUseCase, useValue: discover },
      ],
    }).compile();
    service = module.get(RoutineIntegrationService);
  });

  describe('select', () => {
    it('keeps enabled integrations the user has connected, once each', async () => {
      await expect(
        service.select([TICKETS, CALENDAR, TICKETS]),
      ).resolves.toEqual([TICKETS, CALENDAR]);
    });

    it('rejects an integration the user has not connected', async () => {
      await expect(service.select([TICKETS, NOT_CONNECTED])).rejects.toThrow(
        new RoutineIntegrationUnavailableError(NOT_CONNECTED),
      );
    });

    it('keeps an integration the routine already has, even once it became unavailable', async () => {
      await expect(
        service.select([TICKETS, DISABLED], [DISABLED]),
      ).resolves.toEqual([TICKETS, DISABLED]);
    });

    it('rejects an integration that is disabled or not in the org', async () => {
      await expect(service.select([DISABLED])).rejects.toBeInstanceOf(
        RoutineIntegrationUnavailableError,
      );
    });
  });

  describe('assertUsable', () => {
    it('admits a routine whose integrations are connected and reachable', async () => {
      await expect(
        service.assertUsable(aRoutine({ mcpIntegrationIds: [TICKETS] })),
      ).resolves.toBeUndefined();
    });

    it('fails when an integration was disconnected since the routine was saved', async () => {
      await expect(
        service.assertUsable(aRoutine({ mcpIntegrationIds: [NOT_CONNECTED] })),
      ).rejects.toBeInstanceOf(RoutineIntegrationUnavailableError);
    });

    it('fails when an integration cannot be reached, naming that integration', async () => {
      discover.execute.mockImplementation(({ integrationId }) =>
        integrationId === CALENDAR
          ? Promise.reject(
              new McpConnectionFailedError(
                'https://kalender.musterstadt.de/mcp',
              ),
            )
          : Promise.resolve({ tools: [], resources: [] }),
      );

      await expect(
        service.assertUsable(
          aRoutine({ mcpIntegrationIds: [TICKETS, CALENDAR] }),
        ),
      ).rejects.toThrow(new RoutineIntegrationUnavailableError(CALENDAR));
    });
  });
});
