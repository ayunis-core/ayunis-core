import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cancelStartedThreadRun,
  startThreadRun,
  takeStartedThreadRun,
} from './started-thread-run';
import { abortActiveThreadRun, isThreadRunActive } from './active-thread-run';

const { cancelRun } = vi.hoisted(() => ({
  cancelRun: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  activeRunsControllerCancel: cancelRun,
}));

const threadId = '00000000-0000-0000-0000-000000000001';

function sentForm(fetchMock: ReturnType<typeof vi.fn>): FormData {
  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return init.body as FormData;
}

describe('started thread run', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(new Response('data: {}\n\n'));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    takeStartedThreadRun(threadId);
    abortActiveThreadRun(threadId);
    vi.unstubAllGlobals();
  });

  it('sends the message before anyone takes the run', () => {
    const file = new File(['png'], 'scan.png', { type: 'image/png' });

    startThreadRun({
      threadId,
      text: 'Fasse den Haushalt zusammen',
      images: [{ file }],
      skillId: 'skill-1',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const form = sentForm(fetchMock);
    expect(form.get('threadId')).toBe(threadId);
    expect(form.get('text')).toBe('Fasse den Haushalt zusammen');
    expect(form.get('skillId')).toBe('skill-1');
    expect(form.get('streaming')).toBe('true');
    expect(form.getAll('images')).toHaveLength(1);
    expect(form.get('imageAltTexts')).toBe(JSON.stringify(['scan.png']));
    expect(isThreadRunActive(threadId)).toBe(true);
  });

  it('hands the run to exactly one taker', () => {
    startThreadRun({ threadId, text: 'Hallo', images: [] });

    const run = takeStartedThreadRun(threadId);

    expect(run).toMatchObject({ text: 'Hallo', images: [] });
    expect(takeStartedThreadRun(threadId)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('aborts a run that was cancelled before anyone took it', () => {
    startThreadRun({ threadId, text: 'Hallo', images: [] });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    cancelStartedThreadRun(threadId);

    expect(init.signal?.aborted).toBe(true);
    expect(isThreadRunActive(threadId)).toBe(false);
    expect(takeStartedThreadRun(threadId)).toBeNull();
  });

  it('cancels a cancelled run on the server, where it outlives the request', () => {
    startThreadRun({ threadId, text: 'Hallo', images: [] });

    cancelStartedThreadRun(threadId);

    expect(cancelRun).toHaveBeenCalledWith(threadId);
  });

  it('leaves a run alone once it was taken', () => {
    startThreadRun({ threadId, text: 'Hallo', images: [] });
    const run = takeStartedThreadRun(threadId);
    cancelRun.mockClear();

    cancelStartedThreadRun(threadId);

    expect(cancelRun).not.toHaveBeenCalled();

    expect(run?.request.controller.signal.aborted).toBe(false);
    expect(isThreadRunActive(threadId)).toBe(true);
  });
});
