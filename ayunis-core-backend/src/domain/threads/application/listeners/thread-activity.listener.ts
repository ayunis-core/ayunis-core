import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ThreadMessageAddedEvent } from '../events/thread-message-added.event';
import { RecordThreadActivityUseCase } from '../use-cases/record-thread-activity/record-thread-activity.use-case';
import { RecordThreadActivityCommand } from '../use-cases/record-thread-activity/record-thread-activity.command';

/**
 * Keeps `thread.lastActivityAt` current for data-retention purposes by
 * reacting to every message added to a thread. The event is the single
 * chokepoint for message additions (emitted by AddMessageToThreadUseCase),
 * so this is the one place activity is recorded.
 */
@Injectable()
export class ThreadActivityListener {
  constructor(
    private readonly recordThreadActivity: RecordThreadActivityUseCase,
  ) {}

  @OnEvent(ThreadMessageAddedEvent.EVENT_NAME)
  async handleThreadMessageAdded(
    event: ThreadMessageAddedEvent,
  ): Promise<void> {
    await this.recordThreadActivity.execute(
      new RecordThreadActivityCommand(event.threadId, new Date()),
    );
  }
}
