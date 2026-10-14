import type { TFunction } from 'i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import handleMcpOAuthAuthorizeError from './handle-mcp-oauth-authorize-error';

const { extractErrorData, showError } = vi.hoisted(() => ({
  extractErrorData: vi.fn(),
  showError: vi.fn(),
}));

vi.mock('@/shared/api/extract-error-data', () => ({
  default: extractErrorData,
}));
vi.mock('@/shared/lib/toast', () => ({ showError }));

const t = ((key: string) => key) as TFunction;

describe('handleMcpOAuthAuthorizeError', () => {
  beforeEach(() => vi.clearAllMocks());

  it('tells the user the integration is gone', () => {
    extractErrorData.mockReturnValue({ code: 'MCP_INTEGRATION_NOT_FOUND' });

    handleMcpOAuthAuthorizeError(new Error('authorize failed'), t);

    expect(showError).toHaveBeenCalledWith('integrations.oauth.notFound');
  });

  it.each(['MCP_OAUTH_SERVER_UNREACHABLE', 'MCP_OAUTH_INVALID_RESPONSE'])(
    'points %s at the administrator instead of asking for a retry',
    (code) => {
      extractErrorData.mockReturnValue({ code });

      handleMcpOAuthAuthorizeError(new Error('authorize failed'), t);

      expect(showError).toHaveBeenCalledWith('integrations.oauth.serverError');
    },
  );

  it('asks for a retry on any other backend error', () => {
    extractErrorData.mockReturnValue({ code: 'INTERNAL_SERVER_ERROR' });

    handleMcpOAuthAuthorizeError(new Error('authorize failed'), t);

    expect(showError).toHaveBeenCalledWith('integrations.oauth.connectError');
  });

  it('asks for a retry when the error is not an API response', () => {
    extractErrorData.mockImplementation(() => {
      throw new Error('not an axios error');
    });

    handleMcpOAuthAuthorizeError(new Error('network down'), t);

    expect(showError).toHaveBeenCalledWith('integrations.oauth.connectError');
  });
});
