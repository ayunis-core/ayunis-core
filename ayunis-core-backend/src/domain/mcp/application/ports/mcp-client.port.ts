/**
 * Configuration for connecting to an MCP server
 */
export interface McpConnectionConfig {
  /** Base URL of the MCP server (uses Streamable HTTP transport, MCP protocol 2024-11-05+) */
  serverUrl: string;
  /** Optional authentication header name (e.g., 'Authorization') */
  authHeaderName?: string;
  /** Optional authentication token value */
  authToken?: string;
}

/**
 * Represents an MCP tool with its schema
 */
export interface McpTool {
  name: string;
  description?: string;
  inputSchema: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Represents an MCP resource
 */
export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/**
 * Represents an MCP prompt template
 */
export interface McpPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

/**
 * Tool execution request
 */
export interface McpToolCall {
  toolName: string;
  parameters: Record<string, unknown>;
}

/**
 * Tool execution result
 */
export interface McpToolResult {
  content: unknown;
  isError: boolean;
}

/**
 * Port interface for MCP client operations.
 * Abstracts the MCP SDK to allow testing and alternative implementations.
 *
 * All methods use on-demand connection strategy:
 * 1. Create new client connection
 * 2. Execute operation
 * 3. Close connection (in finally block)
 *
 * All operations enforce 30-second timeout.
 */
export abstract class McpClientPort {
  /**
   * List all tools available on the MCP server
   */
  abstract listTools(config: McpConnectionConfig): Promise<McpTool[]>;

  /**
   * List all resources available on the MCP server
   */
  abstract listResources(config: McpConnectionConfig): Promise<McpResource[]>;

  /**
   * List all prompt templates available on the MCP server
   */
  abstract listPrompts(config: McpConnectionConfig): Promise<McpPrompt[]>;

  /**
   * Execute a tool on the MCP server
   */
  abstract callTool(
    config: McpConnectionConfig,
    call: McpToolCall,
  ): Promise<McpToolResult>;

  /**
   * Read a resource from the MCP server
   * @param uri Resource URI
   * @param parameters Optional parameters for parameterized resources
   */
  abstract readResource(
    config: McpConnectionConfig,
    uri: string,
    parameters?: Record<string, unknown>,
  ): Promise<{ content: string; mimeType: string }>;

  /**
   * Get a prompt template from the MCP server
   * @param name Prompt template name
   * @param args Arguments to fill the prompt template
   */
  abstract getPrompt(
    config: McpConnectionConfig,
    name: string,
    args: Record<string, unknown>,
  ): Promise<{ messages: unknown[] }>;

  /**
   * Validate connection to an MCP server
   * Attempts to connect and list capabilities
   * @returns Object with valid flag and optional error message
   */
  abstract validateConnection(
    config: McpConnectionConfig,
  ): Promise<{ valid: boolean; error?: string }>;
}
