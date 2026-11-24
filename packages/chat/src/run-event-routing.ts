import type {
  RunMasksResponseDto,
  RunMessageResponseDto,
  RunThreadResponseDto,
} from '@ayunis/api-client/schemas';
import type { RunEvent } from './run-stream';
import { mergePiiMasks } from './merge-pii-masks';

export type RunViewEvent = Extract<
  RunEvent,
  { type: 'message' | 'masks' | 'thread' | 'session' }
>;

interface BufferedEvents {
  masks?: RunMasksResponseDto;
  thread?: RunThreadResponseDto;
  messages: Map<string, RunMessageResponseDto>;
}

type Listener = (event: RunViewEvent) => void;

export function createRunEventRouting() {
  const subscribers = new Map<string, Listener>();
  const bufferedByThread = new Map<string, BufferedEvents>();

  function subscribe(threadId: string, listener: Listener): () => void {
    subscribers.set(threadId, listener);
    const buffered = bufferedByThread.get(threadId);
    if (buffered) {
      if (buffered.masks) listener(buffered.masks);
      if (buffered.thread) listener(buffered.thread);
      for (const message of buffered.messages.values()) {
        if (subscribers.get(threadId) !== listener) break;
        listener(message);
      }
    }

    return () => {
      if (subscribers.get(threadId) === listener) subscribers.delete(threadId);
    };
  }

  function publish(threadId: string, event: RunViewEvent): void {
    subscribers.get(threadId)?.(event);
    if (event.type === 'session') return;
    let buffered = bufferedByThread.get(threadId);
    if (!buffered) {
      buffered = { messages: new Map() };
      bufferedByThread.set(threadId, buffered);
    }

    rememberEvent(buffered, event);
  }

  return {
    subscribe,
    publish,
    discard: (threadId: string) => bufferedByThread.delete(threadId),
    clear() {
      subscribers.clear();
      bufferedByThread.clear();
    },
  };
}

function rememberEvent(
  buffered: BufferedEvents,
  event: Exclude<RunViewEvent, { type: 'session' }>,
): void {
  switch (event.type) {
    case 'masks':
      buffered.masks = buffered.masks
        ? { ...event, masks: mergePiiMasks(buffered.masks.masks, event.masks) }
        : event;
      break;
    case 'thread':
      buffered.thread = event;
      break;
    case 'message':
      buffered.messages.set(event.message.id, event);
      break;
  }
}
