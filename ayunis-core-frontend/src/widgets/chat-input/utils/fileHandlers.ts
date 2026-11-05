import type { TFunction } from 'i18next';
import { showError } from '@/shared/lib/toast';

export const ACCEPTED_AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.webm'];

// Non-image extensions accepted by the chat input. Mirrors the backend's
// FILE_EXTENSIONS in src/common/util/file-type.ts; images are routed by MIME
// type instead of extension.
export const ACCEPTED_DOCUMENT_EXTENSIONS = [
  '.pdf',
  '.csv',
  '.xlsx',
  '.xls',
  '.docx',
  '.pptx',
  '.odt',
  '.odp',
  '.txt',
  '.md',
  '.eml',
  '.msg',
  ...ACCEPTED_AUDIO_EXTENSIONS,
];

// Mirrors the backend's MAX_SOURCE_FILE_SIZE_BYTES in
// src/common/util/source-file-upload.ts.
export const MAX_SOURCE_FILE_SIZE_BYTES = 25 * 1024 * 1024;

const BYTES_PER_MB = 1024 * 1024;

export const MAX_SOURCE_FILE_SIZE_MB =
  MAX_SOURCE_FILE_SIZE_BYTES / BYTES_PER_MB;

// Rejects oversized files before any upload request is sent, with one toast
// per rejected file. Sizes round up so a file just over the limit never reads
// as "25 MB" next to a 25 MB limit.
export function keepFilesWithinSizeLimit(files: File[], t: TFunction): File[] {
  return files.filter((file) => {
    if (file.size <= MAX_SOURCE_FILE_SIZE_BYTES) return true;
    showError(
      t('chatInput.fileTooLarge', {
        name: file.name,
        size: Math.ceil(file.size / BYTES_PER_MB),
        limit: MAX_SOURCE_FILE_SIZE_MB,
      }),
    );
    return false;
  });
}

// `accept` value for the chat input's file picker, so the picker and drag-drop
// validation cannot drift apart.
export const ACCEPTED_FILE_PICKER_TYPES = [
  'image/*',
  ...ACCEPTED_DOCUMENT_EXTENSIONS,
].join(',');

export function separateFilesByType(files: FileList): {
  images: File[];
  regularFiles: File[];
} {
  const images: File[] = [];
  const regularFiles: File[] = [];

  Array.from(files).forEach((file) => {
    if (file.type.startsWith('image/')) {
      images.push(file);
    } else {
      regularFiles.push(file);
    }
  });

  return { images, regularFiles };
}

export function createFileListFromFiles(files: File[]): FileList {
  const dataTransfer = new DataTransfer();
  files.forEach((file) => dataTransfer.items.add(file));
  return dataTransfer.files;
}
