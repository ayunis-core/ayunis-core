import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDirectSourceUpload } from './useDirectSourceUpload';

const mocks = vi.hoisted(() => ({ transfer: vi.fn(), abort: vi.fn() }));
vi.mock('./transfer-source-file', () => ({
  transferSourceFile: mocks.transfer,
}));
vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  sourceUploadsControllerAbort: mocks.abort,
}));
const file = new File(['Budget'], 'Budget.pdf');
const completed = { id: 'source-1' };

function setup(onSuccess: () => Promise<void>) {
  const onError = vi.fn();
  const target = {
    createSession: vi.fn(async () => ({
      id: 'upload-1',
      multipart: false,
      partSizeBytes: 8 * 1024 * 1024,
      expiresAt: '2026-11-05T20:00:00Z',
    })),
    complete: vi.fn(async () => completed),
  };
  const hook = renderHook(() =>
    useDirectSourceUpload(target, { onSuccess, onError }),
  );
  return { ...hook, target, onError };
}

describe('upload handoff', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.transfer.mockResolvedValue(undefined);
    mocks.abort.mockResolvedValue(undefined);
  });

  it('keeps the local item until the caller finishes refreshing its list', async () => {
    let finish!: () => void;
    const refresh = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const onSuccess = vi.fn(() => refresh);
    const { result } = setup(onSuccess);
    let uploading!: Promise<typeof completed>;
    act(() => {
      uploading = result.current.uploadAsync(file);
    });
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(result.current.uploads).toHaveLength(1);
    expect(result.current.isUploading).toBe(true);
    await act(async () => {
      finish();
      await uploading;
    });
    expect(result.current.uploads).toHaveLength(0);
    expect(mocks.abort).not.toHaveBeenCalled();
  });

  it('hides an in-flight upload from another scope and reconciles it against its own', async () => {
    const reconciled: string[] = [];
    const target = {
      createSession: vi.fn(async () => ({
        id: 'upload-1',
        multipart: false,
        partSizeBytes: 8 * 1024 * 1024,
        expiresAt: '2026-11-05T20:00:00Z',
      })),
      complete: vi.fn(async () => completed),
    };
    let finishTransfer!: () => void;
    mocks.transfer.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishTransfer = resolve;
        }),
    );
    const { result, rerender } = renderHook(
      ({ scope }: { scope: string }) =>
        useDirectSourceUpload(
          target,
          {
            onSuccess: () => {
              reconciled.push(scope);
            },
          },
          { scope },
        ),
      { initialProps: { scope: 'thread-a' } },
    );
    let uploading!: Promise<typeof completed>;
    act(() => {
      uploading = result.current.uploadAsync(file);
    });
    await waitFor(() => expect(result.current.uploads).toHaveLength(1));

    rerender({ scope: 'thread-b' });
    expect(result.current.uploads).toHaveLength(0);
    expect(result.current.isUploading).toBe(false);

    await act(async () => {
      finishTransfer();
      await uploading;
    });
    expect(reconciled).toEqual(['thread-a']);
    rerender({ scope: 'thread-a' });
    expect(result.current.uploads).toHaveLength(0);
  });

  it('does not abort or report an upload failure when only list refresh fails', async () => {
    const { result, onError } = setup(
      vi.fn().mockRejectedValue(new Error('list refresh unavailable')),
    );
    let uploaded: unknown;
    await act(async () => {
      uploaded = await result.current.uploadAsync(file);
    });
    expect(uploaded).toBe(completed);
    expect(mocks.abort).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(result.current.uploads).toHaveLength(0);
  });

  it('aborts the known session and preserves a completion failure', async () => {
    const { result, target, onError } = setup(
      vi.fn().mockResolvedValue(undefined),
    );
    const original = new Error('completion unavailable');
    target.complete.mockRejectedValue(original);
    mocks.abort.mockRejectedValue(new Error('cleanup unavailable'));
    let failure: unknown;
    await act(async () => {
      failure = await result.current
        .uploadAsync(file)
        .catch((error) => error as unknown);
    });
    expect(failure).toBe(original);
    expect(mocks.abort).toHaveBeenCalledWith('upload-1');
    expect(onError).toHaveBeenCalledWith(original, file);
    expect(result.current.uploads).toHaveLength(0);
  });
});
