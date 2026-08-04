import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client';
import {
  McpClientPort,
  McpConnectionConfig,
  McpTool,
  McpResource,
  McpPrompt,
  McpToolCall,
  McpToolResult,
} from '../../application/ports/mcp-client.port';
import { McpOAuthProviderFactory } from './mcp-oauth-provider.factory';
import { McpIntegrationsRepositoryPort } from '../../application/ports/mcp-integrations.repository.port';
import { SchemaConfiguredMcpIntegration } from '../../domain/integrations/schema-configured-mcp-integration.entity';
import type { UUID } from 'crypto';
import { McpOAuthFetchPort } from '../../application/ports/mcp-oauth-fetch.port';

/**
 * Adapter that wraps @modelcontextprotocol/sdk to provide MCP client functionality.
 *
 * Uses on-demand connection strategy:
 * - Creates new connection for each operation
 * - Closes connection immediately after operation completes
 * - Enforces a 30-second timeout via the SDK's per-request options, so the
 *   SDK aborts its own request cleanly instead of leaving it in flight
 *
 * Uses Streamable HTTP transport for HTTP-based connections (MCP protocol 2024-11-05+).
 */
@Injectable()
export class McpSdkClientAdapter extends McpClientPort {
  private readonly logger = new Logger(McpSdkClientAdapter.name);
  private readonly requestOptions = { timeout: 30000 };

  constructor(
    @Optional() private readonly oauthProviderFactory?: McpOAuthProviderFactory,
    @Optional() private readonly integrations?: McpIntegrationsRepositoryPort,
    @Optional() private readonly oauthFetch?: McpOAuthFetchPort,
  ) {
    super();
  }

  /**
   * List all tools available on the MCP server
   */
  async listTools(config: McpConnectionConfig): Promise<McpTool[]> {
    const client = await this.createClient(config);

    try {
      const result = await client.listTools(undefined, this.requestOptions);

      return result.tools;
    } finally {
      await this.closeQuietly(client);
    }
  }

  /**
   * List all resources available on the MCP server
   */
  async listResources(config: McpConnectionConfig): Promise<McpResource[]> {
    const client = await this.createClient(config);

    try {
      const result = await client.listResources(undefined, this.requestOptions);

      return result.resources;
    } finally {
      await this.closeQuietly(client);
    }
  }

  /**
   * List all resource templates available on the MCP server
   */
  async listResourceTemplates(
    config: McpConnectionConfig,
  ): Promise<McpResource[]> {
    const client = await this.createClient(config);

    try {
      const result = await client.listResourceTemplates(
        undefined,
        this.requestOptions,
      );

      return result.resourceTemplates.map((resourceTemplate) => ({
        uri: resourceTemplate.uriTemplate,
        name: resourceTemplate.name,
        description: resourceTemplate.description,
        mimeType: resourceTemplate.mimeType,
      }));
    } finally {
      await this.closeQuietly(client);
    }
  }

  /**
   * List all prompt templates available on the MCP server
   */
  async listPrompts(config: McpConnectionConfig): Promise<McpPrompt[]> {
    const client = await this.createClient(config);

    try {
      const result = await client.listPrompts(undefined, this.requestOptions);

      return result.prompts;
    } finally {
      await this.closeQuietly(client);
    }
  }

  /**
   * Execute a tool on the MCP server
   */
  async callTool(
    config: McpConnectionConfig,
    call: McpToolCall,
  ): Promise<McpToolResult> {
    const client = await this.createClient(config);

    try {
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
    } finally {
      await this.closeQuietly(client);
    }
  }

  /**
   * Read a resource from the MCP server
   */
  async readResource(
    config: McpConnectionConfig,
    uri: string,
    parameters?: Record<string, unknown>,
  ): Promise<{ content: unknown; mimeType: string }> {
    const client = await this.createClient(config);

    try {
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
    } finally {
      await this.closeQuietly(client);
    }
  }

  /**
   * Get a prompt template from the MCP server
   */
  async getPrompt(
    config: McpConnectionConfig,
    name: string,
    args: Record<string, string>,
  ): Promise<{ messages: unknown[] }> {
    const client = await this.createClient(config);

    try {
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
    } finally {
      await this.closeQuietly(client);
    }
  }

  /**
   * Validate connection to an MCP server.
   * Attempts to connect and list all capabilities (tools, resources, prompts).
   */
  async validateConnection(
    config: McpConnectionConfig,
  ): Promise<{ valid: boolean; error?: string }> {
    let client: Client | null = null;

    try {
      client = await this.createClient(config);

      // Try to list all capabilities to validate connection
      await client.listTools(undefined, this.requestOptions);
      await client.listResources(undefined, this.requestOptions);
      await client.listPrompts(undefined, this.requestOptions);

      return { valid: true };
    } catch (error) {
      this.logger.warn('Connection validation failed', {
        serverUrl: config.serverUrl,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      if (client) {
        await this.closeQuietly(client);
      }
    }
  }

  /**
   * Create and connect a new MCP client
   */
  private async createClient(config: McpConnectionConfig): Promise<Client> {
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
    await client.connect(transport, this.requestOptions);

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

  /**
   * close() aborts the transport, which can itself reject (e.g. AbortError
   * from an in-flight SSE stream). Running in a finally block, that rejection
   * would replace the operation's actual result or error — so it is only
   * logged, never rethrown.
   */
  private async closeQuietly(client: Client): Promise<void> {
    try {
      await client.close();
    } catch (error) {
      this.logger.warn('Failed to close MCP client', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
