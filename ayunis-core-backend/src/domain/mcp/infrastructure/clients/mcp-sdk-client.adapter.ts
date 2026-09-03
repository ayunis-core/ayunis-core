import { Injectable, Optional, Logger } from '@nestjs/common';
import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client';
import {
  McpClientPort,
  McpConnectionConfig,
  McpConnectionScope,
  McpTool,
  McpResource,
  McpPrompt,
  McpToolCall,
  McpToolResult,
  McpRequestOptions,
} from 'src/domain/mcp/application/ports/mcp-client.port';
import { McpOAuthProviderFactory } from './mcp-oauth-provider.factory';
import { McpIntegrationsRepositoryPort } from 'src/domain/mcp/application/ports/mcp-integrations.repository.port';
import { SchemaConfiguredMcpIntegration } from 'src/domain/mcp/domain/integrations/schema-configured-mcp-integration.entity';
import type { UUID } from 'crypto';
import { McpOAuthFetchPort } from 'src/domain/mcp/application/ports/mcp-oauth-fetch.port';
import {
  McpConnectionFailedError,
  McpConnectionTimeoutError,
} from 'src/domain/mcp/application/mcp.errors';
import { classifyTransportError } from 'src/common/errors/provider-transport-error.classifier';
import { ProviderFailureClass } from 'src/common/errors/provider.errors';
import { McpClientPoolService } from './mcp-client-pool.service';

/**
 * Node's AbortController.abort() mints a DOMException with name 'AbortError'
 * and numeric code 20 (DOMException.ABORT_ERR); the MCP SDK signals its own
 * request timeouts as SdkError with string code 'REQUEST_TIMEOUT', and wraps
 * version-negotiation probe failures with the original abort on `data.cause`.
 * The protocol-level timeout answer is JSON-RPC error -32001.
 */
const SDK_TIMEOUT_CODES: ReadonlySet<unknown> = new Set([
  20,
  'REQUEST_TIMEOUT',
  -32001,
]);
const MAX_CAUSE_DEPTH = 4;

function isTimeoutOrAbortError(error: unknown, depth = 0): boolean {
  if (depth >= MAX_CAUSE_DEPTH || typeof error !== 'object' || error === null) {
    return false;
  }
  const candidate = error as {
    name?: unknown;
    code?: unknown;
    cause?: unknown;
    data?: unknown;
  };
  if (
    candidate.name === 'AbortError' ||
    SDK_TIMEOUT_CODES.has(candidate.code)
  ) {
    return true;
  }
  const dataCause =
    typeof candidate.data === 'object' && candidate.data !== null
      ? (candidate.data as { cause?: unknown }).cause
      : undefined;
  return (
    isTimeoutOrAbortError(candidate.cause, depth + 1) ||
    isTimeoutOrAbortError(dataCause, depth + 1)
  );
}

/**
 * Adapter that wraps @modelcontextprotocol/sdk to provide MCP client functionality.
 *
 * Reuses connections with the same server and authentication configuration,
 * closing them after one minute without an active operation. Capability
 * discovery uses a 10-second timeout so an unavailable integration does not
 * hold up a run; explicit validation and runtime operations retain 30 seconds.
 *
 * Uses Streamable HTTP transport for HTTP-based connections (MCP protocol 2024-11-05+).
 */
@Injectable()
export class McpSdkClientAdapter extends McpClientPort {
  private readonly logger = new Logger(McpSdkClientAdapter.name);

  private readonly requestOptions = { timeout: 30000 };

  constructor(
    private readonly clientPool: McpClientPoolService,
    @Optional() private readonly oauthProviderFactory?: McpOAuthProviderFactory,
    @Optional() private readonly integrations?: McpIntegrationsRepositoryPort,
    @Optional() private readonly oauthFetch?: McpOAuthFetchPort,
  ) {
    super();
  }

  /**
   * List all tools available on the MCP server
   */
  async listTools(
    config: McpConnectionConfig,
    options: McpRequestOptions = this.requestOptions,
  ): Promise<McpTool[]> {
    return this.withClient(
      config,
      async (client) => {
        const result = await client.listTools(undefined, options);
        return result.tools;
      },
      options,
    );
  }

  /**
   * List all resources available on the MCP server
   */
  async listResources(
    config: McpConnectionConfig,
    options: McpRequestOptions = this.requestOptions,
  ): Promise<McpResource[]> {
    return this.withClient(
      config,
      async (client) => {
        const result = await client.listResources(undefined, options);
        return result.resources;
      },
      options,
    );
  }

  /**
   * List all resource templates available on the MCP server
   */
  async listResourceTemplates(
    config: McpConnectionConfig,
    options: McpRequestOptions = this.requestOptions,
  ): Promise<McpResource[]> {
    return this.withClient(
      config,
      async (client) => {
        const result = await client.listResourceTemplates(undefined, options);
        return result.resourceTemplates.map((resourceTemplate) => ({
          uri: resourceTemplate.uriTemplate,
          name: resourceTemplate.name,
          description: resourceTemplate.description,
          mimeType: resourceTemplate.mimeType,
        }));
      },
      options,
    );
  }

  /**
   * List all prompt templates available on the MCP server
   */
  async listPrompts(
    config: McpConnectionConfig,
    options: McpRequestOptions = this.requestOptions,
  ): Promise<McpPrompt[]> {
    return this.withClient(
      config,
      async (client) => {
        const result = await client.listPrompts(undefined, options);
        return result.prompts;
      },
      options,
    );
  }

  /**
   * Execute a tool on the MCP server
   */
  async callTool(
    config: McpConnectionConfig,
    call: McpToolCall,
  ): Promise<McpToolResult> {
    return this.withClient(config, async (client) => {
      const result = await client.callTool(
        {
          name: call.toolName,
          arguments: call.parameters,
        },
        this.requestOptions,
      );

      return {
        content: result.content,
        isError: Boolean(result.isError),
      };
    });
  }

  /**
   * Read a resource from the MCP server
   */
  async readResource(
    config: McpConnectionConfig,
    uri: string,
    parameters?: Record<string, unknown>,
  ): Promise<{ content: unknown; mimeType: string }> {
    return this.withClient(config, async (client) => {
      const request = parameters ? { uri, arguments: parameters } : { uri };

      const result = await client.readResource(request, this.requestOptions);

      // MCP resources can have text or blob content
      const firstContent = result.contents[0];
      const content =
        'text' in firstContent ? firstContent.text : firstContent.blob;

      return {
        content: content,
        mimeType: firstContent.mimeType || 'text/plain',
      };
    });
  }

  /**
   * Get a prompt template from the MCP server
   */
  async getPrompt(
    config: McpConnectionConfig,
    name: string,
    args: Record<string, string>,
  ): Promise<{ messages: unknown[] }> {
    return this.withClient(config, async (client) => {
      const result = await client.getPrompt(
        {
          name,
          arguments: args,
        },
        this.requestOptions,
      );

      return {
        messages: result.messages,
      };
    });
  }

  /**
   * SDK timeouts and transport aborts must never escape raw (AYC-651): they
   * surface as McpConnectionTimeoutError so validation endpoints can show a
   * clean user message and capability discovery can skip the integration.
   * Everything else (auth, protocol, HTTP errors) passes through unchanged
   * for the callers' own mapping.
   */
  private async withClient<T>(
    config: McpConnectionConfig,
    operation: (client: Client) => Promise<T>,
    requestOptions = this.requestOptions,
  ): Promise<T> {
    try {
      return await this.clientPool.withClient(
        config,
        () => this.createClient(config, requestOptions),
        operation,
        { connectTimeout: requestOptions.timeout },
      );
    } catch (error) {
      throw this.toOperationError(error, config, requestOptions.timeout);
    }
  }

  private toOperationError(
    error: unknown,
    config: McpConnectionConfig,
    timeoutMs: number,
  ): unknown {
    // Transport errnos (timeouts beyond the SDK's own codes, DNS, reset,
    // broken pipe) must not escape raw either: their raw span duplicates
    // are suppressed AppSignal-side (AYC-616), so the classified error is
    // the only outage signal left.
    const transport = classifyTransportError(error);
    if (
      isTimeoutOrAbortError(error) ||
      transport?.failureClass === ProviderFailureClass.TIMEOUT
    ) {
      return new McpConnectionTimeoutError(config.serverUrl, timeoutMs, error);
    }
    if (transport?.failureClass === ProviderFailureClass.CONNECTION) {
      return new McpConnectionFailedError(config.serverUrl, error);
    }
    return error;
  }

  /**
   * Validate connection to an MCP server.
   * Attempts to connect and list all capabilities (tools, resources, prompts).
   */
  invalidateConnections(scope: McpConnectionScope): Promise<void> {
    return this.clientPool.invalidateConnections(scope);
  }

  async validateConnection(
    config: McpConnectionConfig,
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      await this.withClient(config, async (client) => {
        await client.listTools(undefined, this.requestOptions);
        await client.listResources(undefined, this.requestOptions);
        await client.listPrompts(undefined, this.requestOptions);
      });
      return { valid: true };
    } catch (error) {
      this.logger.warn(
        {
          url: config.serverUrl,
          error: error instanceof Error ? error.message : String(error),
        },
        'Connection validation failed',
      );
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create and connect a new MCP client
   */
  private async createClient(
    config: McpConnectionConfig,
    requestOptions: { timeout: number },
  ): Promise<Client> {
    // Create Streamable HTTP transport (MCP protocol 2024-11-05+)
    // Only pass requestInit with headers when we have headers to add
    // Otherwise, let the SDK handle the default headers (Accept, Content-Type, etc.)
    const hasHeaders = config.headers && Object.keys(config.headers).length > 0;
    const authProvider = await this.buildOAuthProvider(config);
    const oauthFetch = authProvider ? this.requireOAuthFetch() : undefined;
    const transport = new StreamableHTTPClientTransport(
      new URL(config.serverUrl),
      {
        requestInit: hasHeaders
          ? { headers: { ...config.headers } }
          : undefined,
        authProvider,
        onInsufficientScope: 'throw',
        ...(oauthFetch ? { fetchFn: oauthFetch.fetch } : {}),
      },
    );

    // Create client with capabilities
    const client = new Client(
      { name: 'ayunis-core', version: '1.0.0' },
      { versionNegotiation: { mode: 'auto' } },
    );

    // Connect to server (covers the initialize handshake with the same timeout)
    await client.connect(transport, requestOptions);

    return client;
  }

  private async buildOAuthProvider(config: McpConnectionConfig) {
    if (!config.oauth) return undefined;
    if (!this.oauthProviderFactory || !this.integrations) {
      throw new Error('OAuth provider dependencies are unavailable');
    }
    const integration = await this.integrations.findById(
      config.oauth.integrationId as UUID,
    );
    if (!(integration instanceof SchemaConfiguredMcpIntegration)) {
      throw new Error('OAuth integration is unavailable');
    }
    return this.oauthProviderFactory.prepareRuntime({
      integration,
      userId: config.oauth.userId as UUID,
      orgId: config.oauth.orgId as UUID,
    });
  }

  private requireOAuthFetch(): McpOAuthFetchPort {
    if (!this.oauthFetch)
      throw new Error('OAuth fetch dependency is unavailable');
    return this.oauthFetch;
  }
}
