import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGES,
} from '@/widgets/chat-input/model/image-upload-policy';
import { usePendingImages } from '@/widgets/chat-input/hooks/usePendingImages';

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
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
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
  it('accepts only the remaining slot when seven images are attached', () => {
    const { result } = renderHook(() => usePendingImages());
    act(() => {
      result.current.addImages(
        Array.from({ length: 7 }, (_, index) => imageOf(1000, `${index}.jpg`)),
      );
    });
    let outcome;
    act(() => {
      outcome = result.current.addImages([
        imageOf(1000, 'eighth.jpg'),
        imageOf(1000, 'ninth.jpg'),
      ]);
    });
    expect(outcome).toEqual({
      added: 1,
      limitExceeded: true,
      oversizedRejected: false,
    });
    expect(result.current.pendingImages).toHaveLength(8);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(8);
  });
  it('rejects files at full capacity without creating object URLs', () => {
    const { result } = renderHook(() => usePendingImages());
    act(() => {
      result.current.addImages(
        Array.from({ length: MAX_IMAGES }, () => imageOf(1000)),
      );
    });
    let outcome;
    act(() => {
      outcome = result.current.addImages([imageOf(1000)]);
    });
    expect(outcome).toEqual({
      added: 0,
      limitExceeded: true,
      oversizedRejected: false,
    });
    expect(URL.createObjectURL).toHaveBeenCalledTimes(MAX_IMAGES);
  });
  it('reports size and count rejections together without allocating rejected previews', () => {
    const { result } = renderHook(() => usePendingImages());
    let outcome;
    act(() => {
      outcome = result.current.addImages([
        imageOf(MAX_IMAGE_SIZE_BYTES + 1),
        ...Array.from({ length: MAX_IMAGES + 1 }, () => imageOf(1000)),
      ]);
    });
    expect(outcome).toEqual({
      added: MAX_IMAGES,
      limitExceeded: true,
      oversizedRejected: true,
    });
    expect(URL.createObjectURL).toHaveBeenCalledTimes(MAX_IMAGES);
  });
});

it('keeps the upload policy aligned with the documented raw-byte ceiling', () => {
  expect(MAX_IMAGE_SIZE_BYTES).toBe(3932160);
});
