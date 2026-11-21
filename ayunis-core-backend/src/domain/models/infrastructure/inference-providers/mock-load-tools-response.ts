import type {
  ProviderChunk,
  ProviderRequest,
  ToolSchema,
} from '@ayunis/inference';
import { mockTextResponse, mockToolCallResponse } from './mock-chunk-responses';

const LOAD_TOOLS = 'load_tools';
const CALL_ID_PREFIX = 'mock-load-tools-';
const REPORT_PROMPT = 'E2E report tool groups';

/**
 * Answers "E2E report tool groups" with the tool groups the run offers to
 * load and the tools it offers:
 * `tool-groups-report::groups=<ids>::tools=<names>`, `none` for an empty list.
 */
export function mockToolGroupsReport(
  request: ProviderRequest,
  userText: string,
): AsyncIterable<ProviderChunk> | null {
  if (userText !== REPORT_PROMPT) return null;
  const loadTools = request.tools.find((tool) => tool.name === LOAD_TOOLS);
  const groups = loadTools ? loadableGroups(loadTools) : [];
  const tools = request.tools.map((tool) => tool.name);
  return mockTextResponse(
    [
      'tool-groups-report',
      `groups=${groups.join(',') || 'none'}`,
      `tools=${tools.join(',') || 'none'}`,
    ].join('::'),
  );
}

/**
 * Loads every tool group the run offers to load before a scripted call to
 * `toolName` that the run does not offer yet, as a model loads an on-demand
 * capability first. Once this turn has loaded tools, the scripted response
 * follows, so a tool that is still not offered keeps its "not offered" reply.
 */
export function mockLoadToolsFirst(
  request: ProviderRequest,
  toolName: string,
): AsyncIterable<ProviderChunk> | null {
  if (request.tools.some((tool) => tool.name === toolName)) return null;
  const loadTools = request.tools.find((tool) => tool.name === LOAD_TOOLS);
  if (!loadTools || loadedSinceLastUserMessage(request)) return null;
  return mockToolCallResponse(CALL_ID_PREFIX, LOAD_TOOLS, {
    groups: loadableGroups(loadTools),
  });
}

function loadedSinceLastUserMessage(request: ProviderRequest): boolean {
  const lastUser = request.messages.findLastIndex(
    (message) => message.role === 'user',
  );
  return request.messages
    .slice(lastUser + 1)
    .flatMap((message) => message.content)
    .some(
      (part) =>
        part.type === 'tool_result' &&
        part.toolCallId.startsWith(CALL_ID_PREFIX),
    );
}

function loadableGroups(loadTools: ToolSchema): string[] {
  const groups = (loadTools.parameters as GroupsSchema).properties?.groups;
  return groups?.items?.enum ?? [];
}

interface GroupsSchema {
  properties?: { groups?: { items?: { enum?: string[] } } };
}
