import type { ProviderChunk, ProviderRequest } from '@ayunis/inference';

const PREFIX = 'E2E search recordings';
const TOOL_NAME = 'recording_search';
const CALL_ID = 'mock-recording-search';
const USAGE = { inputTokens: 0, outputTokens: 0 } as const;

interface RecordingMatch {
  chunkId: string;
  recordingName: string;
  position: string;
}

/**
 * `E2E search recordings` calls recording_search, optionally with the JSON
 * arguments after a colon, then lists every match with its citation:
 * `recording-search::<count>` and one `<name> (<position>) {{source:…}}`
 * line per match, or `recording-search::unavailable` without the tool.
 */
export function mockRecordingSearchResponse(
  request: ProviderRequest,
  prompt: string,
): AsyncIterable<ProviderChunk> | null {
  if (!prompt.startsWith(PREFIX)) return null;
  if (!request.tools.some((tool) => tool.name === TOOL_NAME)) {
    return textResponse('recording-search::unavailable');
  }
  const lastUser = request.messages.findLastIndex(
    (message) => message.role === 'user',
  );
  const result = request.messages
    .slice(lastUser + 1)
    .flatMap((message) => message.content)
    .find((part) => part.type === 'tool_result' && part.toolCallId === CALL_ID);
  if (result?.type !== 'tool_result') {
    return toolCallResponse(searchArguments(prompt));
  }
  return textResponse(answer(result.result));
}

function searchArguments(prompt: string): Record<string, unknown> {
  const json = prompt.slice(PREFIX.length).replace(/^:\s*/, '').trim();
  const parsed = json ? (JSON.parse(json) as Record<string, unknown>) : {};
  return { queries: ['Haushalt'], ...parsed };
}

function answer(toolResult: string): string {
  let matches: RecordingMatch[];
  try {
    matches = JSON.parse(toolResult) as RecordingMatch[];
  } catch {
    return `recording-search::failed ${toolResult}`;
  }
  if (!Array.isArray(matches)) return `recording-search::failed ${toolResult}`;
  return [
    `recording-search::${matches.length}`,
    ...matches.map(
      (match) =>
        `- ${match.recordingName} (${match.position}) {{source:${match.chunkId}|${label(match.recordingName)}}}`,
    ),
  ].join('\n');
}

function label(name: string): string {
  return name.replace(/[|{}\r\n]/g, ' ').trim() || 'Recording';
}

async function* toolCallResponse(
  input: Record<string, unknown>,
): AsyncIterable<ProviderChunk> {
  await new Promise((resolve) => setTimeout(resolve, 40));
  yield {
    toolCallDeltas: [
      {
        index: 0,
        id: CALL_ID,
        name: TOOL_NAME,
        argumentsDelta: JSON.stringify(input),
      },
    ],
    finishReason: 'tool_calls',
    usage: USAGE,
  };
}

async function* textResponse(text: string): AsyncIterable<ProviderChunk> {
  await new Promise((resolve) => setTimeout(resolve, 40));
  yield { textDelta: text, finishReason: 'stop', usage: USAGE };
}
