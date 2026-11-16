import type { Client } from '@modelcontextprotocol/client';
import { verifyMcpCredentials } from './verify-mcp-credentials';
import { McpCredentialVerificationError } from 'src/domain/mcp/application/mcp-credential-verification.error';

describe('verifyMcpCredentials', () => {
  function client(capabilities: Record<string, unknown> = { tools: {} }) {
    return {
      getServerCapabilities: jest.fn().mockReturnValue(capabilities),
      listTools: jest.fn().mockResolvedValue({ tools: [] }),
      listResources: jest.fn().mockResolvedValue({ resources: [] }),
      listPrompts: jest.fn().mockResolvedValue({ prompts: [] }),
      close: jest.fn().mockResolvedValue(undefined),
    };
  }

  it('accepts a tools-only server without requiring optional capability methods', async () => {
    const candidate = client();
    await verifyMcpCredentials(async () => candidate as unknown as Client);
    expect(candidate.listResources).not.toHaveBeenCalled();
    expect(candidate.listPrompts).not.toHaveBeenCalled();
    expect(candidate.close).toHaveBeenCalledTimes(1);
  });

  it.each(['listResources', 'listPrompts'] as const)(
    'accepts unavailable optional discovery method %s',
    async (method) => {
      const candidate = client({ tools: {}, resources: {}, prompts: {} });
      candidate[method].mockRejectedValue(
        Object.assign(new Error('Method not found'), { code: -32601 }),
      );
      await expect(
        verifyMcpCredentials(async () => candidate as unknown as Client),
      ).resolves.toBeUndefined();
      expect(candidate.close).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    [{ status: 401 }, 'MCP_CREDENTIALS_REJECTED'],
    [
      Object.assign(new Error('personal-token'), { name: 'UnauthorizedError' }),
      'MCP_CREDENTIALS_REJECTED',
    ],
    [
      Object.assign(new Error('personal-token'), {
        name: 'InsufficientScopeError',
      }),
      'MCP_CREDENTIALS_FORBIDDEN',
    ],
    [{ code: 403 }, 'MCP_CREDENTIALS_FORBIDDEN'],
    [{ code: 'REQUEST_TIMEOUT' }, 'MCP_VERIFICATION_TIMEOUT'],
    [{ code: 'ECONNREFUSED' }, 'MCP_VERIFICATION_UNAVAILABLE'],
    [{ status: 503 }, 'MCP_VERIFICATION_UNAVAILABLE'],
    [
      new SyntaxError('upstream body contains personal-token'),
      'MCP_VERIFICATION_INVALID_RESPONSE',
    ],
  ])(
    'returns a safe error for %p without retaining secret-bearing provider data',
    async (error, code) => {
      await expect(
        verifyMcpCredentials(() =>
          Promise.reject(
            error instanceof Error
              ? error
              : Object.assign(new Error('provider failure'), error),
          ),
        ),
      ).rejects.toMatchObject({ code });
      try {
        await verifyMcpCredentials(() =>
          Promise.reject(
            error instanceof Error
              ? error
              : Object.assign(new Error('provider failure'), error),
          ),
        );
      } catch (failure) {
        expect(failure).toBeInstanceOf(McpCredentialVerificationError);
        expect(JSON.stringify(failure)).not.toContain('personal-token');
        expect((failure as Error).cause).toBeUndefined();
      }
    },
  );

  it('closes the temporary connection after a discovery failure', async () => {
    const candidate = client();
    candidate.listTools.mockRejectedValue({ status: 401 });
    await expect(
      verifyMcpCredentials(async () => candidate as unknown as Client),
    ).rejects.toMatchObject({ code: 'MCP_CREDENTIALS_REJECTED' });
    expect(candidate.close).toHaveBeenCalledTimes(1);
  });
});
