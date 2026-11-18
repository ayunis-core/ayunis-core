import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  setEmbeddedSession,
  type EmbeddedSession,
} from '@/shared/api/embedded-session';
import { useApiImageSrc } from '@/shared/hooks/useApiImageSrc';

describe(useApiImageSrc.name, () => {
  afterEach(() => {
    setEmbeddedSession(null);
    vi.restoreAllMocks();
  });

  it('creates no blob URL for an image that finishes loading after the pane left it', async () => {
    let answerBlob: ((blob: Blob) => void) | undefined;
    const response = {
      ok: true,
      blob: () =>
        new Promise<Blob>((resolve) => {
          answerBlob = resolve;
        }),
    } as unknown as Response;
    setEmbeddedSession({
      request: vi.fn().mockResolvedValue(response),
    } as unknown as EmbeddedSession);
    const createObjectURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:image');

    const { unmount } = renderHook(() => useApiImageSrc('/images/1'));
    await vi.waitFor(() => expect(answerBlob).toBeDefined());
    unmount();
    answerBlob?.(new Blob(['png']));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(createObjectURL).not.toHaveBeenCalled();
  });
});
