import type { UUID } from 'crypto';
import type { Message } from 'src/domain/messages/domain/message.entity';
import type {
  RunEvent,
  RunMessageEvent,
} from 'src/domain/runs/application/run-events';
import {
  ActiveThreadRuns,
  UNWATCHED_RUN_TIMEOUT_MS,
} from './active-thread-runs.service';

const THREAD_ID = '3f1c2a7e-5b4d-4e8f-9a6c-0d2e4f6a8b1c' as UUID;
const OTHER_THREAD_ID = '8e2d4c6a-1b3f-4a5e-8c7d-9f0a1b2c3d4e' as UUID;
const OWNER_ID = 'b6a1c3e5-7d9f-4b2a-8c4e-6f8a0b2c4d6e' as UUID;
const OTHER_USER_ID = 'c7b2d4f6-8e0a-4c3b-9d5f-7a9b1c3d5e7f' as UUID;
const ASSISTANT_MESSAGE_ID = 'd8c3e5a7-9f1b-4d4c-8e6a-8b0c2d4e6f8a' as UUID;
const USER_MESSAGE_ID = 'e9d4f6b8-0a2c-4e5d-9f7b-9c1d3e5f7a9b' as UUID;

function sessionEvent(streaming: boolean): RunEvent {
  return {
    type: 'session',
    streaming,
    threadId: THREAD_ID,
    timestamp: '2026-11-07T09:30:00.000Z',
  };
}

function messageEvent(id: UUID, text: string): RunMessageEvent {
  return {
    type: 'message',
    message: { id, text } as unknown as Message,
    threadId: THREAD_ID,
    timestamp: '2026-11-07T09:30:01.000Z',
  };
}

function messageText(event: RunEvent): string | undefined {
  return event.type === 'message'
    ? (event.message as unknown as { text: string }).text
    : undefined;
}

async function take(
  events: AsyncGenerator<RunEvent>,
  count: number,
): Promise<RunEvent[]> {
  const taken: RunEvent[] = [];
  while (taken.length < count) {
    const next = await events.next();
    if (next.done) break;
    taken.push(next.value);
  }
  return taken;
}

async function collect(events: AsyncGenerator<RunEvent>): Promise<RunEvent[]> {
  const collected: RunEvent[] = [];
  for await (const event of events) collected.push(event);
  return collected;
}

function controllableSource() {
  const pending: RunEvent[] = [];
  let wake: (() => void) | undefined;
  let finished = false;
  let receivedSignal: AbortSignal | undefined;
  async function* source(signal: AbortSignal): AsyncGenerator<RunEvent> {
    receivedSignal = signal;
    for (;;) {
      const event = pending.shift();
      if (event) {
        yield event;
        continue;
      }
      if (finished || signal.aborted) return;
      await new Promise<void>((resolve) => {
        wake = resolve;
        signal.addEventListener('abort', () => resolve(), { once: true });
      });
    }
  }
  return {
    source,
    emit(event: RunEvent) {
      pending.push(event);
      wake?.();
    },
    finish() {
      finished = true;
      wake?.();
    },
    signal: () => receivedSignal,
  };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('ActiveThreadRuns', () => {
  let runs: ActiveThreadRuns;

  beforeEach(() => {
    runs = new ActiveThreadRuns();
  });

  describe('detached runs', () => {
    it('keeps running after its listener leaves', async () => {
      const source = controllableSource();
      const run = runs.startDetached(
        { threadId: THREAD_ID, userId: OWNER_ID },
        source.source,
      );
      const listener = new AbortController();
      const events = run.subscribe(listener.signal);
      source.emit(sessionEvent(true));
      await take(events, 1);

      listener.abort();
      await events.return(undefined);
      source.emit(messageEvent(ASSISTANT_MESSAGE_ID, 'Antwort'));
      await flush();

      expect(source.signal()?.aborted).toBe(false);
      expect(runs.listForUser(OWNER_ID)).toEqual([
        { threadId: THREAD_ID, cancellable: true },
      ]);
    });

    it('ends a listener when its signal aborts while it waits for events', async () => {
      const source = controllableSource();
      const run = runs.startDetached(
        { threadId: THREAD_ID, userId: OWNER_ID },
        source.source,
      );
      const listener = new AbortController();
      const events = run.subscribe(listener.signal);
      source.emit(sessionEvent(true));
      await take(events, 1);

      const pendingNext = events.next();
      listener.abort();

      await expect(pendingNext).resolves.toEqual({
        done: true,
        value: undefined,
      });
    });

    it('is removed once its source ends, and its listeners end with it', async () => {
      const source = controllableSource();
      const run = runs.startDetached(
        { threadId: THREAD_ID, userId: OWNER_ID },
        source.source,
      );
      const events = collect(run.subscribe());
      source.emit(sessionEvent(true));
      source.emit(sessionEvent(false));
      source.finish();

      await expect(events).resolves.toEqual([
        sessionEvent(true),
        sessionEvent(false),
      ]);
      expect(runs.listForUser(OWNER_ID)).toEqual([]);
      expect(runs.find(THREAD_ID, OWNER_ID)).toBeUndefined();
    });

    it('is removed when its source throws', async () => {
      // eslint-disable-next-line require-yield, sonarjs/generator-without-yield
      async function* failingSource(): AsyncGenerator<RunEvent> {
        await Promise.resolve();
        throw new Error('provider connection reset');
      }
      const run = runs.startDetached(
        { threadId: THREAD_ID, userId: OWNER_ID },
        failingSource,
      );

      await expect(collect(run.subscribe())).resolves.toEqual([]);
      expect(runs.listForUser(OWNER_ID)).toEqual([]);
    });
  });

  describe('reattaching', () => {
    it('replays the latest snapshot of each message, then follows live events', async () => {
      const source = controllableSource();
      runs.startDetached(
        { threadId: THREAD_ID, userId: OWNER_ID },
        source.source,
      );
      source.emit(sessionEvent(true));
      source.emit(messageEvent(USER_MESSAGE_ID, 'Was gilt für Hunde?'));
      source.emit(messageEvent(ASSISTANT_MESSAGE_ID, 'Laut'));
      source.emit(messageEvent(ASSISTANT_MESSAGE_ID, 'Laut Satzung'));
      await flush();

      const run = runs.find(THREAD_ID, OWNER_ID);
      const events = run!.subscribe();
      const replayed = await take(events, 3);
      source.emit(messageEvent(ASSISTANT_MESSAGE_ID, 'Laut Satzung gilt'));
      const [live] = await take(events, 1);

      expect(replayed.map((event) => event.type)).toEqual([
        'session',
        'message',
        'message',
      ]);
      expect(replayed.map(messageText)).toEqual([
        undefined,
        'Was gilt für Hunde?',
        'Laut Satzung',
      ]);
      expect(messageText(live)).toBe('Laut Satzung gilt');
    });

    it('replays the latest masks and title before the messages', async () => {
      const source = controllableSource();
      runs.startDetached(
        { threadId: THREAD_ID, userId: OWNER_ID },
        source.source,
      );
      const masks = (count: number): RunEvent => ({
        type: 'masks',
        threadId: THREAD_ID,
        masks: Array.from({ length: count }, (_, index) => ({
          id: `mask-${index}`,
          token: `{{pii:PERSON_${index}}}`,
          value: `Erika Mustermann ${index}`,
          category: 'PERSON' as never,
          unmasked: false,
        })),
        timestamp: '2026-11-07T09:30:00.000Z',
      });
      const title: RunEvent = {
        type: 'thread',
        threadId: THREAD_ID,
        updateType: 'title_updated',
        title: 'Hundesteuer',
        timestamp: '2026-11-07T09:30:02.000Z',
      };
      source.emit(sessionEvent(true));
      source.emit(masks(1));
      source.emit(messageEvent(USER_MESSAGE_ID, 'Frage'));
      source.emit(masks(2));
      source.emit(title);
      await flush();

      const replayed = await take(
        runs.find(THREAD_ID, OWNER_ID)!.subscribe(),
        4,
      );

      expect(replayed).toEqual([
        sessionEvent(true),
        masks(2),
        title,
        messageEvent(USER_MESSAGE_ID, 'Frage'),
      ]);
    });

    it('does not reveal another user’s run', () => {
      runs.startDetached(
        { threadId: THREAD_ID, userId: OWNER_ID },
        controllableSource().source,
      );

      expect(runs.find(THREAD_ID, OTHER_USER_ID)).toBeUndefined();
      expect(runs.listForUser(OTHER_USER_ID)).toEqual([]);
    });

    it('attaches to the newest run when two runs share a thread', async () => {
      const first = controllableSource();
      const second = controllableSource();
      runs.startDetached(
        { threadId: THREAD_ID, userId: OWNER_ID },
        first.source,
      );
      const newest = runs.startDetached(
        { threadId: THREAD_ID, userId: OWNER_ID },
        second.source,
      );
      await flush();

      expect(runs.find(THREAD_ID, OWNER_ID)).toBe(newest);
      expect(runs.listForUser(OWNER_ID)).toEqual([
        { threadId: THREAD_ID, cancellable: true },
      ]);
    });
  });

  describe('cancelling', () => {
    it('aborts every run of the owner on that thread', async () => {
      const first = controllableSource();
      const second = controllableSource();
      runs.startDetached(
        { threadId: THREAD_ID, userId: OWNER_ID },
        first.source,
      );
      runs.startDetached(
        { threadId: THREAD_ID, userId: OWNER_ID },
        second.source,
      );
      await flush();

      runs.cancel(THREAD_ID, OWNER_ID);

      expect(first.signal()?.aborted).toBe(true);
      expect(second.signal()?.aborted).toBe(true);
    });

    it('ignores a cancel from another user', async () => {
      const source = controllableSource();
      runs.startDetached(
        { threadId: THREAD_ID, userId: OWNER_ID },
        source.source,
      );
      await flush();

      runs.cancel(THREAD_ID, OTHER_USER_ID);

      expect(source.signal()?.aborted).toBe(false);
    });

    it('leaves runs on other threads alone', async () => {
      const source = controllableSource();
      runs.startDetached(
        { threadId: OTHER_THREAD_ID, userId: OWNER_ID },
        source.source,
      );
      await flush();

      runs.cancel(THREAD_ID, OWNER_ID);

      expect(source.signal()?.aborted).toBe(false);
    });

    it('cannot cancel a run opened without an abort controller', () => {
      const run = runs.open({ threadId: THREAD_ID, userId: OWNER_ID });

      runs.cancel(THREAD_ID, OWNER_ID);

      expect(runs.find(THREAD_ID, OWNER_ID)).toBe(run);
      expect(runs.listForUser(OWNER_ID)).toEqual([
        { threadId: THREAD_ID, cancellable: false },
      ]);
    });
  });

  describe('unwatched runs', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('aborts a cancellable run nobody has watched for the timeout', () => {
      const controller = new AbortController();
      runs.open({
        threadId: THREAD_ID,
        userId: OWNER_ID,
        abortController: controller,
      });

      jest.advanceTimersByTime(UNWATCHED_RUN_TIMEOUT_MS);

      expect(controller.signal.aborted).toBe(true);
    });

    it('keeps a run alive while someone watches it', async () => {
      const controller = new AbortController();
      const run = runs.open({
        threadId: THREAD_ID,
        userId: OWNER_ID,
        abortController: controller,
      });
      const events = run.subscribe();
      const pendingNext = events.next();
      await Promise.resolve();

      jest.advanceTimersByTime(UNWATCHED_RUN_TIMEOUT_MS * 2);

      expect(controller.signal.aborted).toBe(false);
      run.close();
      await pendingNext;
    });

    it('restarts the timeout when the last listener leaves', async () => {
      const controller = new AbortController();
      const run = runs.open({
        threadId: THREAD_ID,
        userId: OWNER_ID,
        abortController: controller,
      });
      run.publish(sessionEvent(true));
      const events = run.subscribe();
      await events.next();
      jest.advanceTimersByTime(UNWATCHED_RUN_TIMEOUT_MS - 1);

      await events.return(undefined);
      jest.advanceTimersByTime(UNWATCHED_RUN_TIMEOUT_MS - 1);
      expect(controller.signal.aborted).toBe(false);

      jest.advanceTimersByTime(1);
      expect(controller.signal.aborted).toBe(true);
    });

    it('stops the timeout once the run is closed', () => {
      const controller = new AbortController();
      const run = runs.open({
        threadId: THREAD_ID,
        userId: OWNER_ID,
        abortController: controller,
      });

      run.close();
      jest.advanceTimersByTime(UNWATCHED_RUN_TIMEOUT_MS);

      expect(controller.signal.aborted).toBe(false);
    });
  });
});
