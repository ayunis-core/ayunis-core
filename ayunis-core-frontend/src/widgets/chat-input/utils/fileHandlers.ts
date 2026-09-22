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
  '.mp3',
  '.m4a',
  '.wav',
  '.webm',
];

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
