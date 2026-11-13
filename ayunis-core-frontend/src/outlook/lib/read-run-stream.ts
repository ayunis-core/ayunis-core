import type {
  RunErrorResponseDto,
  RunMessageResponseDto,
  RunSessionResponseDto,
  RunThreadResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

export type RunStreamEvent =
  | RunMessageResponseDto
  | RunSessionResponseDto
  | RunThreadResponseDto
  | RunErrorResponseDto;

const KNOWN_TYPES = new Set(['message', 'session', 'thread', 'error']);

function parseLine(line: string): RunStreamEvent | null {
  if (!line.startsWith('data: ')) return null;
  try {
    const data = JSON.parse(line.slice('data: '.length)) as { type?: string };
    return data.type && KNOWN_TYPES.has(data.type)
      ? (data as RunStreamEvent)
      : null;
  } catch {
    return null;
  }
}

/**
 * Reads the run's SSE body (`data: <json>` lines, `:` heartbeats). The pane
 * ignores event types it does not render, such as anonymization masks.
 */
export async function readRunStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: RunStreamEvent) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const dispatch = (lines: string[]) => {
    for (const line of lines) {
      const event = parseLine(line);
      if (event) onEvent(event);
    }
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    dispatch(lines);
  }
  buffer += decoder.decode();
  dispatch(buffer.split('\n'));
}
