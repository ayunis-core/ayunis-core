import { randomUUID } from 'crypto';
import { ToolApprovalBrokerService } from './tool-approval-broker.service';

describe('ToolApprovalBrokerService', () => {
  const userId = randomUUID();
  const threadId = randomUUID();
  let broker: ToolApprovalBrokerService;

  beforeEach(() => {
    jest.useFakeTimers();
    broker = new ToolApprovalBrokerService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resumes the waiting call with the owner decision', async () => {
    const pending = broker.awaitDecision({
      threadId,
      toolCallId: 'call-1',
      userId,
    });

    expect(
      broker.decide({
        threadId,
        toolCallId: 'call-1',
        userId,
        decision: 'approved',
      }),
    ).toBe(true);
    await expect(pending).resolves.toBe('approved');
  });

  it('rejects a decision from another user without settling the call', async () => {
    const pending = broker.awaitDecision({
      threadId,
      toolCallId: 'call-2',
      userId,
    });

    expect(
      broker.decide({
        threadId,
        toolCallId: 'call-2',
        userId: randomUUID(),
        decision: 'approved',
      }),
    ).toBe(false);
    expect(
      broker.decide({
        threadId,
        toolCallId: 'call-2',
        userId,
        decision: 'declined',
      }),
    ).toBe(true);
    await expect(pending).resolves.toBe('declined');
  });

  it('keeps same-named calls of different threads apart', async () => {
    const otherThread = randomUUID();
    const otherUser = randomUUID();
    const first = broker.awaitDecision({ threadId, toolCallId: 'c', userId });
    const second = broker.awaitDecision({
      threadId: otherThread,
      toolCallId: 'c',
      userId: otherUser,
    });

    expect(
      broker.decide({
        threadId: otherThread,
        toolCallId: 'c',
        userId: otherUser,
        decision: 'declined',
      }),
    ).toBe(true);
    expect(
      broker.decide({
        threadId,
        toolCallId: 'c',
        userId,
        decision: 'approved',
      }),
    ).toBe(true);
    await expect(first).resolves.toBe('approved');
    await expect(second).resolves.toBe('declined');
  });

  it('releases an earlier wait that is replaced under the same key', async () => {
    const stale = broker.awaitDecision({ threadId, toolCallId: 'c', userId });
    const fresh = broker.awaitDecision({ threadId, toolCallId: 'c', userId });

    await expect(stale).resolves.toBe('aborted');
    broker.decide({ threadId, toolCallId: 'c', userId, decision: 'approved' });
    await expect(fresh).resolves.toBe('approved');
  });

  it('reports an unknown or already settled call', async () => {
    expect(
      broker.decide({
        threadId,
        toolCallId: 'missing',
        userId,
        decision: 'approved',
      }),
    ).toBe(false);

    const pending = broker.awaitDecision({
      threadId,
      toolCallId: 'call-3',
      userId,
    });
    broker.decide({
      threadId,
      toolCallId: 'call-3',
      userId,
      decision: 'approved',
    });
    await pending;

    expect(
      broker.decide({
        threadId,
        toolCallId: 'call-3',
        userId,
        decision: 'declined',
      }),
    ).toBe(false);
  });

  it('times out when nobody decides', async () => {
    const pending = broker.awaitDecision({
      threadId,
      toolCallId: 'call-4',
      userId,
      timeoutMs: 1_000,
    });

    jest.advanceTimersByTime(1_000);

    await expect(pending).resolves.toBe('timed_out');
  });

  it('releases the wait when the run is aborted', async () => {
    const controller = new AbortController();
    const pending = broker.awaitDecision({
      threadId,
      toolCallId: 'call-5',
      userId,
      signal: controller.signal,
    });

    controller.abort();

    await expect(pending).resolves.toBe('aborted');
    expect(
      broker.decide({
        threadId,
        toolCallId: 'call-5',
        userId,
        decision: 'approved',
      }),
    ).toBe(false);
  });

  it('settles immediately when the run was already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      broker.awaitDecision({
        threadId,
        toolCallId: 'call-6',
        userId,
        signal: controller.signal,
      }),
    ).resolves.toBe('aborted');
  });
});
