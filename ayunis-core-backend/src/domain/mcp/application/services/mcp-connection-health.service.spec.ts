import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { McpConnectionHealthService } from './mcp-connection-health.service';
import { mcpConnectionRevision } from './mcp-connection-revision';
import { aCustomMcpIntegration } from 'src/domain/mcp/application/testing/mcp-integration.fixtures';
import { McpIntegrationUserConfig } from 'src/domain/mcp/domain/mcp-integration-user-config.entity';
import {
  McpToolTimeoutError,
  McpConnectionTimeoutError,
} from 'src/domain/mcp/application/mcp.errors';
import { McpRuntimeConnectionError } from 'src/domain/mcp/application/mcp-runtime-connection.error';

describe('MCP runtime connection health', () => {
  const integration = aCustomMcpIntegration({
    configSchema: {
      authType: 'CUSTOM',
      orgFields: [],
      userFields: [
        {
          key: 'token',
          label: 'Token',
          type: 'secret',
          headerName: 'Authorization',
          required: true,
        },
      ],
    },
  });
  const userId = randomUUID();
  const config = () =>
    new McpIntegrationUserConfig({
      integrationId: integration.id,
      userId,
      configValues: { token: 'encrypted:token' },
    });

  it('does not reuse a failed observation after disconnect and recreation with the same token', () => {
    const original = config();
    const recreated = config();
    expect(mcpConnectionRevision(integration, original, null)).not.toBe(
      mcpConnectionRevision(integration, recreated, null),
    );
    expect(mcpConnectionRevision(integration, original, null)).not.toBe(
      mcpConnectionRevision(integration, null, null),
    );
  });

  it('ignores a retained empty credential row after the last user field is removed', () => {
    const withoutUserFields = aCustomMcpIntegration({
      configSchema: {
        authType: 'OAUTH',
        orgFields: [],
        userFields: [],
        oauth: { clientRegistration: 'automatic' },
      },
    });
    const retained = new McpIntegrationUserConfig({
      integrationId: withoutUserFields.id,
      userId,
      configValues: {},
    });
    expect(mcpConnectionRevision(withoutUserFields, retained, null)).toBe(
      mcpConnectionRevision(withoutUserFields, null, null),
    );
  });

  function connectionRequest() {
    return {
      serverUrl: integration.serverUrl,
      connectionScope: {
        orgId: integration.orgId,
        integrationId: integration.id,
        userId,
      },
      observationRevision: 'request-snapshot',
    };
  }

  it('returns a successful MCP result while its health write is still pending', async () => {
    let finishWrite!: () => void;
    const write = new Promise<void>((resolve) => {
      finishWrite = resolve;
    });
    const service = new McpConnectionHealthService({
      record: jest.fn().mockReturnValue(write),
      findForUser: jest.fn(),
    });
    let settled = false;
    const result = service
      .observe(connectionRequest(), () => Promise.resolve('mcp-result'))
      .then((value) => {
        settled = true;
        return value;
      });
    try {
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(settled).toBe(true);
    } finally {
      finishWrite();
      await expect(result).resolves.toBe('mcp-result');
    }
  });

  it('surfaces the sanitized MCP failure while its health write is still pending', async () => {
    let finishWrite!: () => void;
    const write = new Promise<void>((resolve) => {
      finishWrite = resolve;
    });
    const service = new McpConnectionHealthService({
      record: jest.fn().mockReturnValue(write),
      findForUser: jest.fn(),
    });
    let failure: unknown;
    const result = service
      .observe(connectionRequest(), () =>
        Promise.reject(
          Object.assign(new Error('private-token'), { status: 403 }),
        ),
      )
      .catch((error) => {
        failure = error;
      });
    try {
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(failure).toBeInstanceOf(McpRuntimeConnectionError);
      expect(failure).toMatchObject({ reason: 'forbidden' });
    } finally {
      finishWrite();
      await result;
    }
  });

  it.each([false, true])(
    'handles rejected background writes without changing the MCP outcome (failure=%s)',
    async (fails) => {
      const warn = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);
      const service = new McpConnectionHealthService({
        record: jest.fn().mockRejectedValue(new Error('private-token')),
        findForUser: jest.fn(),
      });
      const operation = () =>
        fails
          ? Promise.reject(
              Object.assign(new Error('provider failure'), { status: 403 }),
            )
          : Promise.resolve('mcp-result');
      try {
        const result = service.observe(connectionRequest(), operation);
        if (fails)
          await expect(result).rejects.toMatchObject({ reason: 'forbidden' });
        else await expect(result).resolves.toBe('mcp-result');
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(warn).toHaveBeenCalledTimes(1);
        expect(JSON.stringify(warn.mock.calls)).not.toContain('private-token');
      } finally {
        warn.mockRestore();
      }
    },
  );

  it('records a rejected credential for the affected user and strips the provider response', async () => {
    const record = jest.fn().mockResolvedValue(undefined);
    const service = new McpConnectionHealthService({
      record,
      findForUser: jest.fn(),
    });
    const error = Object.assign(new Error('response contains private-token'), {
      status: 403,
    });
    await expect(
      service.observe(
        {
          serverUrl: integration.serverUrl,
          connectionScope: {
            orgId: integration.orgId,
            integrationId: integration.id,
            userId,
          },
          observationRevision: 'request-snapshot',
        },
        () => Promise.reject(error),
      ),
    ).rejects.toMatchObject({ reason: 'forbidden' });
    expect(record.mock.calls[0][0]).toMatchObject({
      integrationId: integration.id,
      userId,
      failure: 'forbidden',
    });
    expect(JSON.stringify(record.mock.calls)).not.toContain('private-token');
    try {
      await service.observe(
        {
          serverUrl: integration.serverUrl,
          connectionScope: {
            orgId: integration.orgId,
            integrationId: integration.id,
            userId,
          },
          observationRevision: 'request-snapshot',
        },
        () => Promise.reject(error),
      );
    } catch (failure) {
      expect(failure).toBeInstanceOf(McpRuntimeConnectionError);
      expect((failure as Error).cause).toBeUndefined();
    }
  });

  it.each([
    new DOMException('Slow tool', 'AbortError'),
    Object.assign(new Error('Request timed out'), { code: -32001 }),
  ])(
    'preserves tool execution timeouts without recording a broken connection (%s)',
    async (cause) => {
      const record = jest.fn();
      const service = new McpConnectionHealthService({
        record,
        findForUser: jest.fn(),
      });
      const error = new McpToolTimeoutError(
        integration.serverUrl,
        30_000,
        cause,
      );
      await expect(
        service.observe(connectionRequest(), () => Promise.reject(error)),
      ).rejects.toBe(error);
      expect(record).not.toHaveBeenCalled();
    },
  );

  it('still records a connection timeout before tool execution', async () => {
    const record = jest.fn().mockResolvedValue(undefined);
    const service = new McpConnectionHealthService({
      record,
      findForUser: jest.fn(),
    });
    const error = new McpConnectionTimeoutError(integration.serverUrl, 30_000);
    await expect(
      service.observe(connectionRequest(), () => Promise.reject(error)),
    ).rejects.toMatchObject({ reason: 'timeout' });
    expect(record.mock.calls[0][0]).toMatchObject({ failure: 'timeout' });
  });

  it('does not turn a tool-level validation error into a broken connection', async () => {
    const record = jest.fn();
    const service = new McpConnectionHealthService({
      record,
      findForUser: jest.fn(),
    });
    const error = new Error('tool parameter is invalid');
    await expect(
      service.observe(
        {
          serverUrl: integration.serverUrl,
          connectionScope: {
            orgId: integration.orgId,
            integrationId: integration.id,
            userId,
          },
          observationRevision: 'request-snapshot',
        },
        () => Promise.reject(error),
      ),
    ).rejects.toBe(error);
    expect(record).not.toHaveBeenCalled();
  });
  it('clears stale failure health when the MCP call succeeds just before run cancellation', async () => {
    const record = jest.fn().mockResolvedValue(undefined);
    const service = new McpConnectionHealthService({
      record,
      findForUser: jest.fn(),
    });
    const controller = new AbortController();
    const cancellation = new Error('Run stopped after MCP response');
    await expect(
      service.observe(
        connectionRequest(),
        () => {
          controller.abort(cancellation);
          return Promise.resolve('successful MCP response');
        },
        controller.signal,
      ),
    ).rejects.toBe(cancellation);
    expect(record.mock.calls[0]?.[0]).toMatchObject({ failure: null });
    expect(record).toHaveBeenCalledTimes(1);
  });

  it('does not mark a stopped run as a failed MCP connection', async () => {
    const record = jest.fn();
    const service = new McpConnectionHealthService({
      record,
      findForUser: jest.fn(),
    });
    const controller = new AbortController();
    const cancellation = new DOMException('Stopped', 'AbortError');
    const request = {
      serverUrl: integration.serverUrl,
      connectionScope: {
        orgId: integration.orgId,
        integrationId: integration.id,
        userId,
      },
      observationRevision: 'request-snapshot',
    };
    await expect(
      service.observe(
        request,
        () => {
          controller.abort(cancellation);
          return Promise.reject(cancellation);
        },
        controller.signal,
      ),
    ).rejects.toBe(cancellation);
    expect(record).not.toHaveBeenCalled();
  });
});
