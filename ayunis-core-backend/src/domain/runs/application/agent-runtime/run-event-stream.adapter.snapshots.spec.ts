import type { RunEvent, RunEventPayload } from '@ayunis/agent-runtime';
import type { UUID } from 'crypto';
import { createLoggerMock } from 'src/common/testing/logger.mock';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import {
  RunPiiMasksUpdate,
  type RunStreamItem,
} from 'src/domain/runs/domain/run-pii-masks-update.entity';
import { RunMaxIterationsReachedError } from 'src/domain/runs/application/runs.errors';
import {
  EventChannel,
  ManualClock,
  settle,
} from 'src/domain/runs/testing/snapshot-throttle.fixture';
import { THREAD_PII_MASKS_EVENT } from './masks-event';
import { adaptRunEventsToStream } from './run-event-stream.adapter';
import { SNAPSHOT_INTERVAL_MS, SnapshotThrottle } from './snapshot-throttle';

const threadId = '123e4567-e89b-12d3-a456-426614174000' as UUID;

function stamp(payload: RunEventPayload): RunEvent {
  return {
    ...payload,
    runId: 'run-1',
    depth: 0,
    path: ['run-1'],
    timestamp: '2026-11-05T00:00:00.000Z',
  };
}

function delta(text: string): RunEvent {
  return stamp({ type: 'text_delta', delta: text });
}

function assistantMessage(text: string): RunEvent {
  return stamp({
    type: 'assistant_message',
    message: { role: 'assistant', content: [{ type: 'text', text }] },
  });
}

const runEnd = stamp({ type: 'run_end', status: 'completed', usage: {} });

function startAdapter(events: AsyncIterable<RunEvent>, clock: ManualClock) {
  const items: RunStreamItem[] = [];
  const generator = adaptRunEventsToStream(
    events,
    threadId,
    createLoggerMock(),
    { throttle: new SnapshotThrottle(clock) },
  );
  const finished = (async () => {
    for await (const item of generator) items.push(item);
  })();
  return { items, finished };
}

function snapshotTexts(items: RunStreamItem[]): string[] {
  return items
    .filter((item) => item instanceof AssistantMessage)
    .map((message) =>
      message.content
        .filter((content) => content instanceof TextMessageContent)
        .map((content) => content.text)
        .join(''),
    );
}

describe('adaptRunEventsToStream snapshot throttling', () => {
  let clock: ManualClock;
  let source: EventChannel<RunEvent>;

  beforeEach(() => {
    clock = new ManualClock();
    source = new EventChannel<RunEvent>();
  });

  it('sends the first delta at once and coalesces the rest of the interval into one snapshot', async () => {
    const { items, finished } = startAdapter(source, clock);

    source.push(delta('Sehr '));
    source.push(delta('geehrte '));
    source.push(delta('Damen'));
    await settle();
    expect(snapshotTexts(items)).toEqual(['Sehr ']);

    clock.advance(SNAPSHOT_INTERVAL_MS - 1);
    source.push(delta(' und Herren'));
    await settle();
    expect(snapshotTexts(items)).toEqual(['Sehr ']);

    clock.advance(1);
    await settle();
    expect(snapshotTexts(items)).toEqual([
      'Sehr ',
      'Sehr geehrte Damen und Herren',
    ]);

    source.push(runEnd);
    source.end();
    await finished;
  });

  it('sends the held snapshot after one interval while the provider stays silent', async () => {
    const { items, finished } = startAdapter(source, clock);

    source.push(delta('Die Antwort '));
    source.push(delta('folgt'));
    await settle();
    expect(snapshotTexts(items)).toEqual(['Die Antwort ']);

    clock.advance(SNAPSHOT_INTERVAL_MS - 1);
    await settle();
    expect(snapshotTexts(items)).toEqual(['Die Antwort ']);

    clock.advance(1);
    await settle();
    expect(snapshotTexts(items)).toEqual(['Die Antwort ', 'Die Antwort folgt']);

    source.push(runEnd);
    source.end();
    await finished;
  });

  it('bounds the number of snapshots by elapsed time, not by delta count', async () => {
    async function* longAnswer(): AsyncIterable<RunEvent> {
      for (let index = 0; index < 1_000; index++) {
        clock.advance(SNAPSHOT_INTERVAL_MS / 100);
        yield delta('x');
      }
      yield assistantMessage('x'.repeat(1_000));
      yield runEnd;
    }

    const { items, finished } = startAdapter(longAnswer(), clock);
    await finished;

    const texts = snapshotTexts(items);
    // 750 ms of deltas allow one snapshot per 75 ms plus the final message.
    expect(texts.length).toBeLessThanOrEqual(12);
    expect(texts.at(-2)).toBe('x'.repeat(1_000));
    expect(texts.at(-1)).toBe('x'.repeat(1_000));
  });

  it.each<[string, RunEventPayload, (item: RunStreamItem) => boolean]>([
    [
      'an assistant message',
      {
        type: 'assistant_message',
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: 'Hallo Welt' }],
        },
      },
      (item) => item instanceof AssistantMessage,
    ],
    [
      'a tool result message',
      {
        type: 'tool_result_message',
        endsRun: false,
        message: {
          role: 'tool_result',
          content: [
            {
              type: 'tool_result',
              toolCallId: 'c1',
              toolName: 'internet_search',
              result: 'Bitburg',
            },
          ],
        },
      },
      (item) => item instanceof ToolResultMessage,
    ],
    [
      'a PII mask update',
      {
        type: 'custom',
        name: THREAD_PII_MASKS_EVENT,
        data: [{ token: '{{pii:PERSON_1}}' }],
      },
      (item) => item instanceof RunPiiMasksUpdate,
    ],
  ])(
    'sends the latest snapshot before %s',
    async (_label, payload, isFollowingItem) => {
      async function* events(): AsyncIterable<RunEvent> {
        yield delta('Hallo');
        yield delta(' Welt');
        yield stamp(payload);
        yield runEnd;
      }

      const { items, finished } = startAdapter(events(), clock);
      await finished;

      expect(snapshotTexts(items.slice(0, 2))).toEqual(['Hallo', 'Hallo Welt']);
      expect(isFollowingItem(items[2])).toBe(true);
    },
  );

  it('sends the latest snapshot before surfacing a run error', async () => {
    async function* events(): AsyncIterable<RunEvent> {
      yield delta('Teil');
      yield delta('antwort');
      yield stamp({
        type: 'error',
        code: 'MAX_ITERATIONS_REACHED',
        message: 'too many',
        details: { maxIterations: 7 },
      });
      yield stamp({ type: 'run_end', status: 'max_iterations', usage: {} });
    }

    const { items, finished } = startAdapter(events(), clock);

    await expect(finished).rejects.toBeInstanceOf(RunMaxIterationsReachedError);
    expect(snapshotTexts(items)).toEqual(['Teil', 'Teilantwort']);
  });

  it('sends the latest snapshot before an aborted run ends', async () => {
    async function* events(): AsyncIterable<RunEvent> {
      yield delta('Abge');
      yield delta('brochen');
      yield stamp({ type: 'run_end', status: 'aborted', usage: {} });
    }
    const generator = adaptRunEventsToStream(
      events(),
      threadId,
      createLoggerMock(),
      { throttle: new SnapshotThrottle(clock) },
    );

    const items: RunStreamItem[] = [];
    let next = await generator.next();
    while (!next.done) {
      items.push(next.value);
      next = await generator.next();
    }

    expect(snapshotTexts(items)).toEqual(['Abge', 'Abgebrochen']);
    expect(next.value).toBe('aborted');
  });

  it('sends the latest snapshot before rethrowing a runtime failure', async () => {
    async function* events(): AsyncIterable<RunEvent> {
      yield delta('Zwischen');
      yield delta('stand');
      throw new Error('runtime crashed');
    }

    const { items, finished } = startAdapter(events(), clock);

    await expect(finished).rejects.toThrow('runtime crashed');
    expect(snapshotTexts(items)).toEqual(['Zwischen', 'Zwischenstand']);
  });
});
