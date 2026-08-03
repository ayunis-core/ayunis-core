import type { RunEvent, RunEventPayload } from '@ayunis/agent-runtime';
import type { UUID } from 'crypto';
import type { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import type { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import {
  RunPiiMasksUpdate,
  type RunStreamItem,
} from '../../domain/run-pii-masks-update.entity';
import {
  RunExecutionFailedError,
  RunMaxIterationsReachedError,
} from '../runs.errors';
import { adaptRunEventsToStream } from './run-event-stream.adapter';
import { THREAD_PII_MASKS_EVENT } from './masks-event';

const threadId = '123e4567-e89b-12d3-a456-426614174000' as UUID;

function stamp(payload: RunEventPayload): RunEvent {
  return {
    ...payload,
    runId: 'run-1',
    depth: 0,
    path: ['run-1'],
    timestamp: '2026-07-17T00:00:00.000Z',
  };
}

async function* eventsFrom(
  payloads: RunEventPayload[],
): AsyncIterable<RunEvent> {
  for (const payload of payloads) {
    yield stamp(payload);
  }
}

async function collect(
  events: AsyncIterable<RunEvent>,
): Promise<RunStreamItem[]> {
  const items: RunStreamItem[] = [];
  for await (const item of adaptRunEventsToStream(events, threadId)) {
    items.push(item);
  }
  return items;
}

describe('adaptRunEventsToStream', () => {
  it('accumulates text deltas into a growing assistant message with a stable id', async () => {
    const items = await collect(
      eventsFrom([
        { type: 'run_start', maxIterations: 20 },
        { type: 'text_delta', delta: 'Hel' },
        { type: 'text_delta', delta: 'lo' },
        {
          type: 'assistant_message',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'Hello' }],
          },
          usage: { inputTokens: 1, outputTokens: 1 },
        },
        { type: 'run_end', status: 'completed', usage: {} },
      ]),
    );

    expect(items).toHaveLength(3);
    const [tick1, tick2, final] = items as AssistantMessage[];
    expect((tick1.content[0] as TextMessageContent).text).toBe('Hel');
    expect((tick2.content[0] as TextMessageContent).text).toBe('Hello');
    // streamed ticks and the authoritative message share one id
    expect(tick1.id).toBe(tick2.id);
    expect(final.id).toBe(tick1.id);
    expect((final.content[0] as TextMessageContent).text).toBe('Hello');
  });

  it('maps a tool_result_message to a backend ToolResultMessage', async () => {
    const items = await collect(
      eventsFrom([
        {
          type: 'tool_result_message',
          message: {
            role: 'tool_result',
            content: [
              {
                type: 'tool_result',
                toolCallId: 'c1',
                toolName: 'search',
                result: 'done',
              },
            ],
          },
        },
      ]),
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toBeInstanceOf(ToolResultMessage);
  });

  it('maps a mask custom event to RunPiiMasksUpdate', async () => {
    const masks = [{ token: '{{pii:PERSON_1}}' }];
    const items = await collect(
      eventsFrom([
        { type: 'custom', name: THREAD_PII_MASKS_EVENT, data: masks },
        { type: 'custom', name: 'unrelated', data: {} },
      ]),
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toBeInstanceOf(RunPiiMasksUpdate);
    expect((items[0] as RunPiiMasksUpdate).masks).toBe(masks);
  });

  it('throws RunMaxIterationsReachedError only after draining the stream', async () => {
    const seen: string[] = [];
    async function* events(): AsyncIterable<RunEvent> {
      yield stamp({
        type: 'error',
        code: 'MAX_ITERATIONS_REACHED',
        message: 'too many',
        details: { maxIterations: 7 },
      });
      seen.push('after-error');
      yield stamp({ type: 'run_end', status: 'max_iterations', usage: {} });
      seen.push('after-run-end');
    }

    await expect(collect(events())).rejects.toBeInstanceOf(
      RunMaxIterationsReachedError,
    );
    // the generator was fully drained before the error surfaced
    expect(seen).toEqual(['after-error', 'after-run-end']);
  });

  it('maps other error events to RunExecutionFailedError', async () => {
    await expect(
      collect(
        eventsFrom([
          {
            type: 'error',
            code: 'PROVIDER_FAILED',
            message: 'upstream 500',
          },
          { type: 'run_end', status: 'error', usage: {} },
        ]),
      ),
    ).rejects.toBeInstanceOf(RunExecutionFailedError);
  });
});
