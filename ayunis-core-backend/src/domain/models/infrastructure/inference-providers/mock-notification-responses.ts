import type { ProviderChunk, ProviderRequest } from '@ayunis/inference';

const NOTIFY_ROUTINE_PROMPT = 'E2E notify routine';
const QUOTE_NOTIFICATION_PROMPT = 'E2E quote notification';
const SEND_NOTIFICATION_TOOL = 'send_notification';
const FINISH_ROUTINE_TOOL = 'finish_routine';
const SEND_NOTIFICATION_CALL_ID = 'mock-send-notification';
const MOCK_USAGE = { inputTokens: 0, outputTokens: 0 } as const;

/**
 * What a routine whose task starts with the trigger reports. The headline
 * names the text after the trigger, so a test can tell its notification
 * apart from others in the same inbox.
 */
export function mockRoutineNotification(task: string) {
  const subject = task.slice(NOTIFY_ROUTINE_PROMPT.length).replace(/^:\s*/, '');
  return {
    headline: `Neue Verordnung: ${subject || 'Grundsteuer'}`,
    subheadline: 'GVBl. NRW Nr. 34 vom 07.11.2026',
    body: 'Die [Verordnung zur Änderung der Grundsteuer](https://example.org/gvbl/2026/34) wurde heute verkündet.\n\n- Neue Hebesätze ab 2027\n- Betrifft das Steueramt',
  };
}

/**
 * A routine run whose task starts with the trigger sends one notification
 * and then finishes, like a routine that found something relevant.
 */
export function mockNotifyRoutineResponse(
  request: ProviderRequest,
): AsyncIterable<ProviderChunk> | null {
  const offered = new Set(request.tools.map((tool) => tool.name));
  if (
    !offered.has(SEND_NOTIFICATION_TOOL) ||
    !offered.has(FINISH_ROUTINE_TOOL)
  ) {
    return null;
  }
  const task = request.messages
    .find((message) => message.role === 'user')
    ?.content.find((part) => part.type === 'text');
  if (task?.type !== 'text' || !task.text.startsWith(NOTIFY_ROUTINE_PROMPT)) {
    return null;
  }
  return hasSentNotification(request)
    ? toolCallResponse('mock-finish-routine', FINISH_ROUTINE_TOOL, {})
    : toolCallResponse(
        SEND_NOTIFICATION_CALL_ID,
        SEND_NOTIFICATION_TOOL,
        mockRoutineNotification(task.text),
      );
}

/**
 * Answers the trigger with the headline of the notification the chat is
 * about, read from the system prompt, so E2E can prove it reaches the model.
 */
export function mockQuoteNotificationResponse(
  request: ProviderRequest,
  userText: string,
): AsyncIterable<ProviderChunk> | null {
  if (userText !== QUOTE_NOTIFICATION_PROMPT) return null;
  const headline =
    /<notification_under_discussion>[\s\S]*?<headline>([\s\S]*?)<\/headline>/.exec(
      request.instructions,
    )?.[1];
  return textResponse(`notification::${headline ?? 'none'}`);
}

function hasSentNotification(request: ProviderRequest): boolean {
  return request.messages.some(
    (message) =>
      message.role === 'tool_result' &&
      message.content.some(
        (part) =>
          part.type === 'tool_result' &&
          part.toolCallId === SEND_NOTIFICATION_CALL_ID,
      ),
  );
}

async function* toolCallResponse(
  id: string,
  name: string,
  input: object,
): AsyncIterable<ProviderChunk> {
  await new Promise((resolve) => setTimeout(resolve, 40));
  yield {
    toolCallDeltas: [
      { index: 0, id, name, argumentsDelta: JSON.stringify(input) },
    ],
    finishReason: 'tool_calls',
    usage: MOCK_USAGE,
  };
}

async function* textResponse(text: string): AsyncIterable<ProviderChunk> {
  await new Promise((resolve) => setTimeout(resolve, 40));
  yield { textDelta: text, finishReason: 'stop', usage: MOCK_USAGE };
}
