import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
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
    const logger = createPinoLoggerMock();
    const service = new McpToolAssemblerService(discover, getByIds, logger);
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
