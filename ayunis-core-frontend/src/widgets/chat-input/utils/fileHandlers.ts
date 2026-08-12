// Document extensions accepted by the chat input (drag-drop + file picker).
// Images are handled separately; tabular/audio types are covered elsewhere.
export const ACCEPTED_DOCUMENT_EXTENSIONS = [
  '.pdf',
  '.csv',
  '.xlsx',
  '.xls',
  '.docx',
  '.pptx',
  '.txt',
  '.eml',
];

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
