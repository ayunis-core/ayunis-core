import { describe, expect, it, vi } from 'vitest';
import {
  keepFilesWithinSizeLimit,
  MAX_SOURCE_FILE_SIZE_BYTES,
} from './fileHandlers';

const mocks = vi.hoisted(() => ({ showError: vi.fn() }));
vi.mock('@/shared/lib/toast', () => ({ showError: mocks.showError }));

function fileOfSize(name: string, bytes: number): File {
  const file = new File([''], name);
  Object.defineProperty(file, 'size', { value: bytes });
  return file;
}

describe('keepFilesWithinSizeLimit', () => {
  const t = (key: string) => key;

  it('drops an oversized document with one toast', () => {
    const kept = keepFilesWithinSizeLimit(
      [fileOfSize('bericht.pdf', MAX_SOURCE_FILE_SIZE_BYTES + 1)],
      t as never,
    );

    expect(kept).toEqual([]);
    expect(mocks.showError).toHaveBeenCalledOnce();
  });

  it('leaves recordings to the server-side cap', () => {
    const recording = fileOfSize('Sitzung.MP3', 200 * 1024 * 1024);

    const kept = keepFilesWithinSizeLimit([recording], t as never);

    expect(kept).toEqual([recording]);
  });
});
