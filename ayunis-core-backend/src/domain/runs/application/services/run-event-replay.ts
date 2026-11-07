import type {
  RunEvent,
  RunMasksEvent,
  RunMessageEvent,
  RunSessionEvent,
  RunThreadEvent,
} from 'src/domain/runs/application/run-events';

/**
 * Keeps what a listener joining a run late needs to catch up. Message events
 * carry full snapshots and masks the full dictionary, so the latest of each
 * stands in for everything before it.
 */
export class RunEventReplay {
  private start?: RunSessionEvent;
  private masks?: RunMasksEvent;
  private title?: RunThreadEvent;
  private readonly messages = new Map<string, RunMessageEvent>();
  private readonly endings: RunEvent[] = [];

  record(event: RunEvent): void {
    switch (event.type) {
      case 'session':
        if (event.streaming) this.start ??= event;
        else this.endings.push(event);
        return;
      case 'masks':
        this.masks = event;
        return;
      case 'thread':
        this.title = event;
        return;
      case 'message':
        this.messages.set(event.message.id, event);
        return;
      case 'error':
        this.endings.push(event);
        return;
    }
  }

  /** Masks come before messages so the client can resolve their tokens. */
  events(): RunEvent[] {
    return [
      ...(this.start ? [this.start] : []),
      ...(this.masks ? [this.masks] : []),
      ...(this.title ? [this.title] : []),
      ...this.messages.values(),
      ...this.endings,
    ];
  }
}
