/**
 * Behavioral hints an MCP server declares for a tool (MCP spec 2025-03-26).
 * Hints are advisory; a missing `readOnlyHint` means the tool may write.
 */
export interface McpToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}
