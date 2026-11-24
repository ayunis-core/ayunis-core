import type {
  ProviderChunk,
  ProviderRequest,
  ToolResultContent,
} from '@ayunis/inference';
import { mockTextResponse, mockToolCallResponse } from './mock-chunk-responses';

const PREFIX = 'E2E search the marketplace';
const TOOL_NAME = 'marketplace_search';
const CALL_ID_PREFIX = 'mock-marketplace-search-';

interface CatalogueEntry {
  type: string;
  identifier: string;
  installUrl: string;
}

/**
 * `E2E search the marketplace` calls marketplace_search, optionally with the
 * JSON arguments after a colon, then answers `marketplace-search::<count>`
 * and one `<type> <identifier> <installUrl>` line per entry, or
 * `marketplace-search::unavailable` without the tool.
 */
export function mockMarketplaceSearchResponse(
  request: ProviderRequest,
  prompt: string,
): AsyncIterable<ProviderChunk> | null {
  if (!prompt.startsWith(PREFIX)) return null;
  if (!request.tools.some((tool) => tool.name === TOOL_NAME)) {
    return mockTextResponse('marketplace-search::unavailable');
  }
  const result = resultSinceLastUserMessage(request);
  if (!result) {
    return mockToolCallResponse(
      CALL_ID_PREFIX,
      TOOL_NAME,
      searchArguments(prompt),
    );
  }
  return mockTextResponse(answer(result.result));
}

function resultSinceLastUserMessage(
  request: ProviderRequest,
): ToolResultContent | undefined {
  const lastUser = request.messages.findLastIndex(
    (message) => message.role === 'user',
  );
  return request.messages
    .slice(lastUser + 1)
    .flatMap((message) => message.content)
    .find(
      (part): part is ToolResultContent =>
        part.type === 'tool_result' &&
        part.toolCallId.startsWith(CALL_ID_PREFIX),
    );
}

function searchArguments(prompt: string): Record<string, unknown> {
  const json = prompt.slice(PREFIX.length).replace(/^:\s*/, '').trim();
  return json ? (JSON.parse(json) as Record<string, unknown>) : {};
}

function answer(toolResult: string): string {
  let entries: CatalogueEntry[];
  try {
    ({ entries } = JSON.parse(toolResult) as { entries: CatalogueEntry[] });
  } catch {
    return `marketplace-search::failed ${toolResult}`;
  }
  if (!Array.isArray(entries)) {
    return `marketplace-search::failed ${toolResult}`;
  }
  return [
    `marketplace-search::${entries.length}`,
    ...entries.map(
      (entry) => `${entry.type} ${entry.identifier} ${entry.installUrl}`,
    ),
  ].join('\n');
}
