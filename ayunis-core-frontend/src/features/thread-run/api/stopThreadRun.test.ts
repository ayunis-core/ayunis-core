import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  forgetStoppedThreadRunsExcept,
  isThreadRunStopped,
} from '@/features/thread-run/model/stopped-thread-runs';
import { stopThreadRun } from './stopThreadRun';

const { cancelRun } = vi.hoisted(() => ({ cancelRun: vi.fn() }));
vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  activeRunsControllerCancel: cancelRun,
}));

const threadId = '00000000-0000-0000-0000-000000000001';

describe(stopThreadRun.name, () => {
  afterEach(() => forgetStoppedThreadRunsExcept(new Set()));

  it('keeps the run marked stopped once the server cancelled it', async () => {
    cancelRun.mockResolvedValue(undefined);

    stopThreadRun(threadId);
    await vi.waitFor(() => expect(cancelRun).toHaveBeenCalled());

    expect(isThreadRunStopped(threadId)).toBe(true);
  });

  it('lets the chat follow the run again when the server could not cancel it', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    cancelRun.mockRejectedValue(new Error('Network Error'));

    stopThreadRun(threadId);

    await vi.waitFor(() => expect(isThreadRunStopped(threadId)).toBe(false));
  });
});
