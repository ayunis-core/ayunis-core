import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ThreadDeletionRequestedEvent } from 'src/domain/threads/application/events/thread-deletion-requested.event';
import { ActiveThreadRuns } from 'src/domain/runs/application/services/active-thread-runs.service';

/**
 * Runs outlive their requests, so deleting a chat has to stop its run.
 * Stopping rolls back the unfinished turn, so it waits for the delete to
 * succeed: a failed delete must leave the chat as it was.
 */
@Injectable()
export class CancelRunsOnThreadDeletionListener {
  constructor(private readonly activeThreadRuns: ActiveThreadRuns) {}

  @OnEvent(ThreadDeletionRequestedEvent.EVENT_NAME)
  handle(event: ThreadDeletionRequestedEvent): void {
    event.deferCleanup('cancel thread runs', () => {
      this.activeThreadRuns.cancel(event.threadId, event.userId);
      return Promise.resolve();
    });
  }
}
