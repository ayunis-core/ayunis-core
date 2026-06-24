import type { CustomEventInput, RunEventPayload } from '../contracts/event';

/**
 * Buffer between push-style emitters (hooks, tools) and the pull-style run
 * generator. The loop drains it after every step so hook/tool emits
 * interleave with streamed events in order.
 */
export class EmitBuffer {
  private buffer: CustomEventInput[] = [];

  push(event: CustomEventInput): void {
    this.buffer.push(event);
  }

  drain(): CustomEventInput[] {
    const drained = this.buffer;
    this.buffer = [];
    return drained;
  }
}

export function* drainEmits(state: {
  emits: EmitBuffer;
}): Generator<RunEventPayload> {
  for (const event of state.emits.drain()) {
    yield { type: 'custom', name: event.name, data: event.data };
  }
}
