import type { TFunction } from 'i18next';
import { showError } from '@/shared/lib/toast';

const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.webm'];

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
  ...AUDIO_EXTENSIONS,
];

// Mirrors the backend's MAX_SOURCE_FILE_SIZE_BYTES in
// src/common/util/source-file-upload.ts.
export const MAX_SOURCE_FILE_SIZE_BYTES = 25 * 1024 * 1024;

// Mirrors the default of the backend's PDF_MAX_UPLOAD_BYTES in
// src/config/source-upload.config.ts. A deployment that lowers it answers a
// larger PDF with FILE_TOO_LARGE.
export const MAX_PDF_FILE_SIZE_BYTES = 100 * 1024 * 1024;

// Recordings have a server-configured cap (AUDIO_MAX_UPLOAD_BYTES); the API
// answers an oversized one with FILE_TOO_LARGE, so they skip the local check.
function isAudioFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return AUDIO_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function sizeLimitFor(file: File): number {
  return file.name.toLowerCase().endsWith('.pdf')
    ? MAX_PDF_FILE_SIZE_BYTES
    : MAX_SOURCE_FILE_SIZE_BYTES;
}

const BYTES_PER_MB = 1024 * 1024;

// Rejects oversized files before any upload request is sent, with one toast
// per rejected file. Sizes round up so a file just over the limit never reads
// as "25 MB" next to a 25 MB limit.
export function keepFilesWithinSizeLimit(files: File[], t: TFunction): File[] {
  return files.filter((file) => {
    if (isAudioFileName(file.name)) return true;
    const limit = sizeLimitFor(file);
    if (file.size <= limit) return true;
    showError(
      t('chatInput.fileTooLarge', {
        name: file.name,
        size: Math.ceil(file.size / BYTES_PER_MB),
        limit: limit / BYTES_PER_MB,
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

export const ACCEPTED_AUDIO_PICKER_TYPES = AUDIO_EXTENSIONS.join(',');

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
