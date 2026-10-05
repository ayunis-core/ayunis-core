import { createLoggerMock } from 'src/common/testing/logger.mock';
import { randomUUID } from 'crypto';
import { setError } from '@appsignal/nodejs';
import { McpToolAssemblerService } from './mcp-tool-assembler.service';
import {
  McpConnectionFailedError,
  McpConnectionTimeoutError,
} from 'src/domain/mcp/application/mcp.errors';
import type { DiscoverMcpCapabilitiesUseCase } from 'src/domain/mcp/application/use-cases/discover-mcp-capabilities/discover-mcp-capabilities.use-case';
import type { GetMcpIntegrationsByIdsUseCase } from 'src/domain/mcp/application/use-cases/get-mcp-integrations-by-ids/get-mcp-integrations-by-ids.use-case';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import { McpTool } from 'src/domain/mcp/domain/mcp-tool.entity';
import type { DiscoverMcpCapabilitiesQuery } from 'src/domain/mcp/application/use-cases/discover-mcp-capabilities/discover-mcp-capabilities.query';

jest.mock('@appsignal/nodejs', () => ({
  setError: jest.fn(),
}));

describe('McpToolAssemblerService — discovery outage reporting (AYC-616)', () => {
  const integrationId = randomUUID();

  afterEach(() => {
    jest.clearAllMocks();
  });

  const buildService = (discoveryRejection: Error) => {
    const discover = {
      execute: jest.fn().mockRejectedValue(discoveryRejection),
    } as unknown as DiscoverMcpCapabilitiesUseCase;
    const getByIds = {
      execute: jest
        .fn()
        .mockResolvedValue([{ id: integrationId, name: 'Test Integration' }]),
    } as unknown as GetMcpIntegrationsByIdsUseCase;
    const logger = createLoggerMock();
    const service = new McpToolAssemblerService(discover, getByIds);
    return { service, logger };
  };

  const thread = { mcpIntegrationIds: [integrationId] } as unknown as Thread;

  it('reports a classified connection outage while still soft-skipping the integration', async () => {
    const outage = new McpConnectionFailedError(
      'https://example.com/mcp',
      new Error('getaddrinfo EAI_AGAIN example.com'),
    );
    const { service } = buildService(outage);

    const tools = await service.assemble(thread, new Set());

    expect(tools).toEqual([]);
    expect(setError).toHaveBeenCalledWith(outage);
  });

  it('reports a classified connection timeout while still soft-skipping the integration', async () => {
    const timeout = new McpConnectionTimeoutError(
      'https://example.com/mcp',
      30_000,
    );
    const { service } = buildService(timeout);

    const tools = await service.assemble(thread, new Set());

    expect(tools).toEqual([]);
    expect(setError).toHaveBeenCalledWith(timeout);
  });

  it('does not report discovery failures that are not connectivity outages', async () => {
    const { service, logger } = buildService(new Error('Method not found'));

    const tools = await service.assemble(thread, new Set());

    expect(tools).toEqual([]);
    expect(setError).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ integrationName: 'Test Integration' }),
      'MCP integration unavailable, skipping',
    );
  });
});

describe('McpToolAssemblerService — capability names', () => {
  const outlineId = randomUUID();
  const recordsId = randomUUID();

  function buildService() {
    const capabilitiesByIntegration = new Map([
      [
        outlineId,
        {
          tools: [
            new McpTool(
              'create_document',
              'Create an Outline document',
              { type: 'object', properties: {} },
              outlineId,
            ),
          ],
          resources: [],
          prompts: [],
          returnsPii: false,
        },
      ],
      [
        recordsId,
        {
          tools: [
            new McpTool(
              'create_document',
              'Create a records document',
              { type: 'object', properties: {} },
              recordsId,
            ),
          ],
          resources: [],
          prompts: [],
          returnsPii: false,
        },
      ],
    ]);
    const discover = {
      execute: jest.fn((query: DiscoverMcpCapabilitiesQuery) =>
        Promise.resolve(capabilitiesByIntegration.get(query.integrationId)),
      ),
    } as unknown as DiscoverMcpCapabilitiesUseCase;
    const getByIds = {
      execute: jest.fn().mockResolvedValue([
        { id: outlineId, name: 'Outline Bremerhaven' },
        { id: recordsId, name: 'Records Archive' },
      ]),
    } as unknown as GetMcpIntegrationsByIdsUseCase;

    return new McpToolAssemblerService(discover, getByIds);
  }

  it('keeps an MCP capability whose upstream name is reserved by a built-in', async () => {
    const service = buildService();
    const thread = {
      mcpIntegrationIds: [outlineId],
    } as unknown as Thread;

    const tools = await service.assemble(thread, new Set(['create_document']));

    expect(tools.map((tool) => tool.name)).toEqual([
      `mcp__tool__create_document__${outlineId.slice(0, 8)}`,
    ]);
  });

  it('keeps same-named capabilities from different integrations distinct', async () => {
    const service = buildService();
    const thread = {
      mcpIntegrationIds: [outlineId, recordsId],
    } as unknown as Thread;

    const tools = await service.assemble(thread, new Set());

    expect(tools.map((tool) => tool.name)).toEqual([
      `mcp__tool__create_document__${outlineId.slice(0, 8)}`,
      `mcp__tool__create_document__${recordsId.slice(0, 8)}`,
    ]);
  });
});
