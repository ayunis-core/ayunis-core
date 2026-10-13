import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGES,
  usePendingImages,
} from '@/widgets/chat-input/hooks/usePendingImages';

function imageOf(bytes: number, name = 'photo.jpg'): File {
  const file = new File([''], name, { type: 'image/jpeg' });
  Object.defineProperty(file, 'size', { value: bytes });
  return file;
}

describe('usePendingImages', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:preview'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('attaches an image at the size limit', () => {
    const { result } = renderHook(() => usePendingImages());

    let outcome;
    act(() => {
      outcome = result.current.addImages([imageOf(MAX_IMAGE_SIZE_BYTES)]);
    });

    expect(outcome).toEqual({
      added: 1,
      limitExceeded: false,
      oversizedRejected: false,
    });
    expect(result.current.pendingImages).toHaveLength(1);
  });

  it('refuses an image over the size limit and keeps the rest', () => {
    const { result } = renderHook(() => usePendingImages());

    let outcome;
    act(() => {
      outcome = result.current.addImages([
        imageOf(MAX_IMAGE_SIZE_BYTES + 1, 'huge.jpg'),
        imageOf(1_000, 'small.jpg'),
      ]);
    });

    expect(outcome).toEqual({
      added: 1,
      limitExceeded: false,
      oversizedRejected: true,
    });
    expect(result.current.pendingImages.map((img) => img.file.name)).toEqual([
      'small.jpg',
    ]);
  });

  it('does not count refused images against the image limit', () => {
    const { result } = renderHook(() => usePendingImages());

    let outcome;
    act(() => {
      outcome = result.current.addImages([
        imageOf(MAX_IMAGE_SIZE_BYTES + 1),
        ...Array.from({ length: MAX_IMAGES }, (_, i) =>
          imageOf(1_000, `${i}.jpg`),
        ),
      ]);
    });

    expect(outcome).toEqual({
      added: MAX_IMAGES,
      limitExceeded: false,
      oversizedRejected: true,
    });
  });
});
