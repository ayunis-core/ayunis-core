import type {
  RunErrorResponseDto,
  RunIntegrationWarningResponseDto,
  RunMasksResponseDto,
  RunMessageResponseDto,
  RunSessionResponseDto,
  RunThreadResponseDto,
} from '@ayunis/api-client/schemas';

export type RunEvent =
  | RunErrorResponseDto
  | RunIntegrationWarningResponseDto
  | RunMasksResponseDto
  | RunMessageResponseDto
  | RunSessionResponseDto
  | RunThreadResponseDto;

function dispatchLine(line: string, onEvent: (event: RunEvent) => void): void {
  if (!line.startsWith('data: ')) return;
  try {
    const event = JSON.parse(line.slice(6)) as RunEvent;
    const type = event.type;
    switch (type) {
      case 'message':
      case 'session':
      case 'thread':
      case 'masks':
      case 'integration_warning':
      case 'error':
        onEvent(event);
        return;
    }
    console.warn('Unknown SSE event type:', type);
  } catch (parseError) {
    console.warn('Failed to parse SSE data:', line, parseError);
  }
}

export async function readRunEvents(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: RunEvent) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    let chunk = await reader.read();
    while (!chunk.done) {
      buffer += decoder.decode(chunk.value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      lines.forEach((line) => dispatchLine(line, onEvent));
      chunk = await reader.read();
    }
  } catch (readerError) {
    console.error('Error reading SSE stream:', readerError);
    throw readerError;
  } finally {
    reader.releaseLock();
  }
  // Some proxies close after the last event before its trailing newline.
  (buffer + decoder.decode())
    .split('\n')
    .forEach((line) => dispatchLine(line, onEvent));
}
