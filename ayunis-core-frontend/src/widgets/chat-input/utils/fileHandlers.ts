import type { TFunction } from 'i18next';
import { showError } from '@/shared/lib/toast';
import {
  FILE_SIZE_MIB,
  oversizedDocumentLimit,
} from '@ayunis/chat/upload-policy';

export {
  ACCEPTED_DOCUMENT_EXTENSIONS,
  ACCEPTED_FILE_PICKER_TYPES,
  MAX_SOURCE_FILE_SIZE_BYTES,
  MAX_PDF_FILE_SIZE_BYTES,
} from '@ayunis/chat/upload-policy';
export { ACCEPTED_AUDIO_PICKER_TYPES } from '@/shared/lib/audio-files';

// Rejects oversized files before any upload request is sent, with one toast
// per rejected file. Sizes round up so a file just over the limit never reads
// as "25 MB" next to a 25 MB limit.
export function keepFilesWithinSizeLimit(files: File[], t: TFunction): File[] {
  return files.filter((file) => {
    const limit = oversizedDocumentLimit(file);
    if (limit === undefined) return true;
    showError(
      t('chatInput.fileTooLarge', {
        name: file.name,
        size: Math.ceil(file.size / FILE_SIZE_MIB),
        limit: limit / FILE_SIZE_MIB,
      }),
    );
    return false;
  });
}

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
