import type { CallToolResult } from '@modelcontextprotocol/client';

export interface RuntimeMcpResult {
  readonly content: CallToolResult['content'];
  readonly structuredContent?: unknown;
  readonly isError: boolean;
}

export const toRuntimeMcpResult = (
  result: CallToolResult,
): RuntimeMcpResult => ({
  content: result.content,
  ...(result.structuredContent === undefined
    ? {}
    : { structuredContent: result.structuredContent }),
  isError: result.isError ?? false,
});

export const serializeMcpResult = (result: RuntimeMcpResult): string =>
  JSON.stringify(result);
