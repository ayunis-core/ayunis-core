import { act, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from 'vitest';
import { useFileDrop } from '@/widgets/chat-input/hooks/useFileDrop';
import {
  ACCEPTED_DOCUMENT_EXTENSIONS,
  MAX_SOURCE_FILE_SIZE_BYTES,
} from '@/widgets/chat-input/utils/fileHandlers';

const mocks = vi.hoisted(() => ({ showError: vi.fn() }));

vi.mock('@/shared/lib/toast', () => ({ showError: mocks.showError }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key} ${JSON.stringify(options)}` : key,
  }),
}));

function fileOfSize(name: string, bytes: number): File {
  const file = new File(['data'], name);
  Object.defineProperty(file, 'size', { value: bytes });
  return file;
}

function asFileList(files: File[]): FileList {
  return Object.assign({ length: files.length }, files) as unknown as FileList;
}

describe('useFileDrop', () => {
  let container: HTMLDivElement;
  let onDocumentDrop: Mock<(files: File[]) => void>;
  let onImagesDrop: Mock<(files: File[]) => void>;

  function dropFiles(...files: File[]) {
    const event = new Event('drop', { bubbles: true });
    Object.defineProperty(event, 'dataTransfer', {
      value: { files: asFileList(files) },
    });
    act(() => {
      container.dispatchEvent(event);
    });
  }

  function renderFileDrop() {
    return renderHook(() =>
      useFileDrop({
        containerRef: { current: container },
        onDocumentDrop,
        onImagesDrop,
        isDocumentUploadEnabled: true,
        isImageUploadEnabled: true,
        acceptedDocumentExtensions: ACCEPTED_DOCUMENT_EXTENSIONS,
      }),
    );
  }

  beforeEach(() => {
    mocks.showError.mockClear();
    onDocumentDrop = vi.fn<(files: File[]) => void>();
    onImagesDrop = vi.fn<(files: File[]) => void>();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it.each([
    'recording.m4a',
    'recording.mp3',
    'recording.wav',
    'recording.webm',
    'notes.md',
    'anfrage.eml',
    'anfrage.msg',
  ])('attaches a dropped %s', (fileName) => {
    renderFileDrop();
    const file = new File(['data'], fileName);

    dropFiles(file);

    expect(onDocumentDrop).toHaveBeenCalledWith([file]);
    expect(mocks.showError).not.toHaveBeenCalled();
  });

  it('rejects an unsupported file type', () => {
    renderFileDrop();

    dropFiles(new File(['data'], 'installer.exe'));

    expect(onDocumentDrop).not.toHaveBeenCalled();
    expect(mocks.showError).toHaveBeenCalledWith(
      'chatInput.invalidDroppedFileType',
    );
  });

  it('attaches the supported files of a mixed drop and reports the rest', () => {
    renderFileDrop();
    const audio = new File(['data'], 'recording.m4a');

    dropFiles(audio, new File(['data'], 'installer.exe'));

    expect(onDocumentDrop).toHaveBeenCalledWith([audio]);
    expect(mocks.showError).toHaveBeenCalledWith(
      'chatInput.invalidDroppedFileType',
    );
  });

  it('rejects a document above the size limit and attaches the rest', () => {
    renderFileDrop();
    const small = fileOfSize('notes.pdf', MAX_SOURCE_FILE_SIZE_BYTES);
    const large = fileOfSize('sitzung.m4a', 164 * 1024 * 1024);

    dropFiles(small, large);

    expect(onDocumentDrop).toHaveBeenCalledWith([small]);
    expect(mocks.showError).toHaveBeenCalledTimes(1);
    expect(mocks.showError).toHaveBeenCalledWith(
      'chatInput.fileTooLarge {"name":"sitzung.m4a","size":164,"limit":25}',
    );
  });

  it('does not attach anything when every document is too large', () => {
    renderFileDrop();

    dropFiles(fileOfSize('a.m4a', MAX_SOURCE_FILE_SIZE_BYTES + 1));

    expect(onDocumentDrop).not.toHaveBeenCalled();
    expect(mocks.showError).toHaveBeenCalledWith(
      'chatInput.fileTooLarge {"name":"a.m4a","size":26,"limit":25}',
    );
  });
});
