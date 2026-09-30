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
import { ACCEPTED_DOCUMENT_EXTENSIONS } from '@/widgets/chat-input/utils/fileHandlers';

const mocks = vi.hoisted(() => ({ showError: vi.fn() }));

vi.mock('@/shared/lib/toast', () => ({ showError: mocks.showError }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

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
});
