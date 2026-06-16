import { randomUUID } from 'crypto';
import { ThreadActivityListener } from './thread-activity.listener';
import type { RecordThreadActivityUseCase } from '../use-cases/record-thread-activity/record-thread-activity.use-case';
import { ThreadMessageAddedEvent } from '../events/thread-message-added.event';

describe('ThreadActivityListener', () => {
  let listener: ThreadActivityListener;
  let recordThreadActivity: { execute: jest.Mock };

  beforeEach(() => {
    recordThreadActivity = { execute: jest.fn().mockResolvedValue(undefined) };
    listener = new ThreadActivityListener(
      recordThreadActivity as unknown as RecordThreadActivityUseCase,
    );
  });

  it('records activity for the thread named in the message-added event', async () => {
    const threadId = randomUUID();
    const event = new ThreadMessageAddedEvent(
      randomUUID(),
      randomUUID(),
      threadId,
      3,
    );

    await listener.handleThreadMessageAdded(event);

    expect(recordThreadActivity.execute).toHaveBeenCalledTimes(1);
    expect(recordThreadActivity.execute).toHaveBeenCalledWith(
      expect.objectContaining({ threadId }),
    );
  });
});
