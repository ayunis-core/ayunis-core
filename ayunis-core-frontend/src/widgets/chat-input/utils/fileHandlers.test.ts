import { describe, expect, it, vi } from 'vitest';
import {
  keepFilesWithinSizeLimit,
  MAX_PDF_FILE_SIZE_BYTES,
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
      [fileOfSize('bericht.docx', MAX_SOURCE_FILE_SIZE_BYTES + 1)],
      t as never,
    );

    expect(kept).toEqual([]);
    expect(mocks.showError).toHaveBeenCalledOnce();
  });

  it('accepts a PDF up to the PDF limit, which is above the document limit', () => {
    const pdf = fileOfSize('Haushaltsplan.PDF', MAX_PDF_FILE_SIZE_BYTES);

    expect(keepFilesWithinSizeLimit([pdf], t as never)).toEqual([pdf]);
    expect(MAX_PDF_FILE_SIZE_BYTES).toBeGreaterThan(MAX_SOURCE_FILE_SIZE_BYTES);
  });

  it('drops a PDF above the PDF limit and names that limit', () => {
    mocks.showError.mockClear();
    const translate = (key: string, values: object) =>
      `${key} ${JSON.stringify(values)}`;

    const kept = keepFilesWithinSizeLimit(
      [fileOfSize('archiv.pdf', MAX_PDF_FILE_SIZE_BYTES + 1)],
      translate as never,
    );

    expect(kept).toEqual([]);
    expect(mocks.showError).toHaveBeenCalledWith(
      'chatInput.fileTooLarge {"name":"archiv.pdf","size":101,"limit":100}',
    );
  });

  it('leaves recordings to the server-side cap', () => {
    const recording = fileOfSize('Sitzung.MP3', 200 * 1024 * 1024);

    const kept = keepFilesWithinSizeLimit([recording], t as never);

    expect(kept).toEqual([recording]);
  });
});
