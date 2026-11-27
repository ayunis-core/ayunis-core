import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  configureApiTransport,
  createApiTransport,
} from '@ayunis/api-client/transport';
import { useApiImageSrc } from './use-api-image-src';

describe(useApiImageSrc.name, () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    configureApiTransport(
      createApiTransport({
        baseUrl: '/api',
        credentials: 'omit',
        authorization: { getHeader: () => 'Bearer test-token' },
      }),
    );
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
