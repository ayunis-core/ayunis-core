export const FILE_SIZE_MIB = 1024 * 1024;
export const MAX_SOURCE_FILE_SIZE_BYTES = 25 * FILE_SIZE_MIB;
export const MAX_PDF_FILE_SIZE_BYTES = 100 * FILE_SIZE_MIB;
export const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.webm'];
export const ACCEPTED_AUDIO_PICKER_TYPES = AUDIO_EXTENSIONS.join(',');

export function isAudioFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return AUDIO_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

// Mirrors the source types and default upload limits in the backend.
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
  '.xml',
  '.html',
  '.htm',
  '.eml',
  '.msg',
  ...AUDIO_EXTENSIONS,
];

export const ACCEPTED_FILE_PICKER_TYPES = [
  'image/*',
  ...ACCEPTED_DOCUMENT_EXTENSIONS,
].join(',');

export function oversizedDocumentLimit(file: File): number | undefined {
  if (isAudioFileName(file.name)) return undefined;
  const limit = file.name.toLowerCase().endsWith('.pdf')
    ? MAX_PDF_FILE_SIZE_BYTES
    : MAX_SOURCE_FILE_SIZE_BYTES;
  return file.size > limit ? limit : undefined;
}

export function composerFileType(
  file: File,
): { kind: 'image' | 'unsupported' } | { kind: 'document'; limit?: number } {
  if (file.type.startsWith('image/')) return { kind: 'image' };
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ACCEPTED_DOCUMENT_EXTENSIONS.includes(extension))
    return { kind: 'unsupported' };
  return { kind: 'document', limit: oversizedDocumentLimit(file) };
}
