import { Injectable, Logger } from '@nestjs/common';
// MCP SDK imports - using direct subpath exports
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
  McpClientPort,
  McpConnectionConfig,
  McpTool,
  McpResource,
  McpPrompt,
  McpToolCall,
  McpToolResult,
} from '../../application/ports/mcp-client.port';

/**
 * Adapter that wraps @modelcontextprotocol/sdk to provide MCP client functionality.
 *
 * Uses on-demand connection strategy:
 * - Creates new connection for each operation
 * - Closes connection immediately after operation completes
 * - Enforces 30-second timeout on all operations
 *
 * Uses Streamable HTTP transport for HTTP-based connections (MCP protocol 2024-11-05+).
 */
@Injectable()
export class McpSdkClientAdapter extends McpClientPort {
  private readonly logger = new Logger(McpSdkClientAdapter.name);
  private readonly TIMEOUT_MS = 30000; // 30 seconds

  /**
   * List all tools available on the MCP server
   */
  async listTools(config: McpConnectionConfig): Promise<McpTool[]> {
    let client: Client | null = null;

    try {
      client = await this.createClient(config);

      const result = await this.withTimeout(client.listTools());

      return result.tools;
    } finally {
      if (client) {
        await client.close();
      }
    }
  }

  /**
   * List all resources available on the MCP server
   */
  async listResources(config: McpConnectionConfig): Promise<McpResource[]> {
    let client: Client | null = null;

    try {
      client = await this.createClient(config);

      const result = await this.withTimeout(client.listResources());

      return result.resources;
    } finally {
      if (client) {
        await client.close();
      }
    }
  }

  /**
   * List all resource templates available on the MCP server
   */
  async listResourceTemplates(
    config: McpConnectionConfig,
  ): Promise<McpResource[]> {
    let client: Client | null = null;

    try {
      client = await this.createClient(config);
      const result = await this.withTimeout(client.listResourceTemplates());

      return result.resourceTemplates.map((resourceTemplate) => ({
        uri: resourceTemplate.uriTemplate,
        name: resourceTemplate.name,
        description: resourceTemplate.description,
        mimeType: resourceTemplate.mimeType,
      }));
    } finally {
      if (client) {
        await client.close();
      }
    }
  }

  /**
   * List all prompt templates available on the MCP server
   */
  async listPrompts(config: McpConnectionConfig): Promise<McpPrompt[]> {
    let client: Client | null = null;

    try {
      client = await this.createClient(config);

      const result = await this.withTimeout(client.listPrompts());

      return result.prompts;
    } finally {
      if (client) {
        await client.close();
      }
    }
  }

  /**
   * Execute a tool on the MCP server
   */
  async callTool(
    config: McpConnectionConfig,
    call: McpToolCall,
  ): Promise<McpToolResult> {
    let client: Client | null = null;

    try {
      client = await this.createClient(config);

      const result = await this.withTimeout(
        client.callTool({
          name: call.toolName,
          arguments: call.parameters,
        }),
      );

      return {
        content: result.content,
        isError: Boolean(result.isError),
      };
    } finally {
      if (client) {
        await client.close();
      }
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
    let client: Client | null = null;

    try {
      client = await this.createClient(config);

      const request = parameters ? { uri, arguments: parameters } : { uri };

      const result = await this.withTimeout(client.readResource(request));

      // MCP resources can have text or blob content
      const firstContent = result.contents[0];
      const content =
        'text' in firstContent ? firstContent.text : firstContent.blob;

      return {
        content: content,
        mimeType: firstContent.mimeType || 'text/plain',
      };
    } finally {
      if (client) {
        await client.close();
      }
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
    let client: Client | null = null;

    try {
      client = await this.createClient(config);

      const result = await this.withTimeout(
        client.getPrompt({
          name,
          arguments: args,
        }),
      );

      return {
        messages: result.messages,
      };
    } finally {
      if (client) {
        await client.close();
      }
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
      await this.withTimeout(client.listTools());
      await this.withTimeout(client.listResources());
      await this.withTimeout(client.listPrompts());

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
        await client.close();
      }
    }
  }

  /**
   * Create and connect a new MCP client
   */
  private async createClient(config: McpConnectionConfig): Promise<Client> {
    // Build headers with optional authentication
    const headers: Record<string, string> = {};
    if (config.authHeaderName && config.authToken) {
      headers[config.authHeaderName] = config.authToken;
    }

    // Create Streamable HTTP transport (MCP protocol 2024-11-05+)
    const transport = new StreamableHTTPClientTransport(
      new URL(config.serverUrl),
      {
        requestInit: { headers },
      },
    );

    // Create client with capabilities
    const client = new Client(
      { name: 'ayunis-core', version: '1.0.0' },
      { capabilities: { tools: {}, resources: {}, prompts: {} } },
    );

    // Connect to server
    await client.connect(transport);

    return client;
  }

  /**
   * Wrap a promise with timeout enforcement
   */
  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('MCP request timeout')),
        this.TIMEOUT_MS,
      ),
    );

    return Promise.race([promise, timeoutPromise]);
  }
}
