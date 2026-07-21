import { extname } from 'path';

/**
 * MIME types for supported document formats
 */
export const MIME_TYPES = {
  // PDF
  PDF: 'application/pdf',

  // Word
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

  // PowerPoint
  PPTX: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  // Excel
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  XLS: 'application/vnd.ms-excel',

  // CSV
  CSV: 'text/csv',

  // Plain text
  TXT: 'text/plain',

  // Markdown
  MD: 'text/markdown',

  // Audio — formats supported by the STT pipeline (Mistral voxtral).
  // Keep this list in sync with TranscribeUseCase's supportedMimeTypes.
  MP3: 'audio/mpeg',
  M4A: 'audio/x-m4a',
  M4A_ALT: 'audio/mp4',
  WAV: 'audio/wav',
  WEBM: 'audio/webm',
} as const;

/**
 * Supported file extensions
 */
export const FILE_EXTENSIONS = {
  PDF: '.pdf',
  DOCX: '.docx',
  PPTX: '.pptx',
  XLSX: '.xlsx',
  XLS: '.xls',
  CSV: '.csv',
  TXT: '.txt',
  MD: '.md',
  MP3: '.mp3',
  M4A: '.m4a',
  WAV: '.wav',
  WEBM: '.webm',
} as const;

// Names shown in UnsupportedFileTypeError messages by the source-upload flows.
export const SUPPORTED_FILE_TYPES: string[] = [
  'PDF',
  'DOCX',
  'PPTX',
  'TXT',
  'CSV',
  'XLSX',
  'XLS',
  'MP3',
  'M4A',
  'WAV',
  'WEBM',
];

export type DetectedFileType =
  | 'pdf'
  | 'docx'
  | 'pptx'
  | 'xlsx'
  | 'xls'
  | 'csv'
  | 'txt'
  | 'mp3'
  | 'm4a'
  | 'wav'
  | 'webm'
  | 'unknown';

/** Lookup: MIME type → detected file type */
const MIME_TO_FILE_TYPE: Record<string, DetectedFileType> = {
  [MIME_TYPES.PDF]: 'pdf',
  [MIME_TYPES.DOCX]: 'docx',
  [MIME_TYPES.PPTX]: 'pptx',
  [MIME_TYPES.XLSX]: 'xlsx',
  [MIME_TYPES.CSV]: 'csv',
  // Note: MIME_TYPES.XLS is intentionally excluded — XLS MIME can also indicate CSV files
  // Note: MIME_TYPES.TXT is intentionally excluded — text/plain is too broad (matches .md, .log, .json, etc.)
  [MIME_TYPES.MD]: 'txt',
  [MIME_TYPES.MP3]: 'mp3',
  [MIME_TYPES.M4A]: 'm4a',
  [MIME_TYPES.M4A_ALT]: 'm4a',
  [MIME_TYPES.WAV]: 'wav',
  [MIME_TYPES.WEBM]: 'webm',
};

/** Lookup: file extension → detected file type */
const EXT_TO_FILE_TYPE: Record<string, DetectedFileType> = {
  [FILE_EXTENSIONS.PDF]: 'pdf',
  [FILE_EXTENSIONS.DOCX]: 'docx',
  [FILE_EXTENSIONS.PPTX]: 'pptx',
  [FILE_EXTENSIONS.XLSX]: 'xlsx',
  [FILE_EXTENSIONS.XLS]: 'xls',
  [FILE_EXTENSIONS.CSV]: 'csv',
  [FILE_EXTENSIONS.TXT]: 'txt',
  [FILE_EXTENSIONS.MD]: 'txt',
  [FILE_EXTENSIONS.MP3]: 'mp3',
  [FILE_EXTENSIONS.M4A]: 'm4a',
  [FILE_EXTENSIONS.WAV]: 'wav',
  [FILE_EXTENSIONS.WEBM]: 'webm',
};

/**
 * Detect file type from MIME type and filename extension.
 * Uses both MIME type and extension for disambiguation since browsers
 * can send incorrect MIME types.
 */
export function detectFileType(
  mimetype: string,
  filename: string,
): DetectedFileType {
  const ext = extname(filename).toLowerCase();

  // Special case: XLS extension takes precedence over CSV MIME type.
  // Some clients send .xls files with text/csv MIME type, but we should
  // trust the extension for XLS files since XLS MIME can also indicate CSV.
  if (ext === FILE_EXTENSIONS.XLS) {
    return 'xls';
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- lookup returns undefined for unknown keys at runtime
  return MIME_TO_FILE_TYPE[mimetype] ?? EXT_TO_FILE_TYPE[ext] ?? 'unknown';
}

/**
 * Check if the file type is a plain text file (TXT)
 */
export function isPlainTextFile(fileType: DetectedFileType): boolean {
  return fileType === 'txt';
}

/**
 * Check if the file type is a document (PDF, Word, PowerPoint)
 */
export function isDocumentFile(fileType: DetectedFileType): boolean {
  return fileType === 'pdf' || fileType === 'docx' || fileType === 'pptx';
}

/**
 * Check if the file type is a spreadsheet (Excel)
 */
export function isSpreadsheetFile(fileType: DetectedFileType): boolean {
  return fileType === 'xlsx' || fileType === 'xls';
}

/**
 * Check if the file type is CSV
 */
export function isCSVFile(fileType: DetectedFileType): boolean {
  return fileType === 'csv';
}

/**
 * Check if the file type is an audio file (MP3, M4A, WAV, WebM)
 */
export function isAudioFile(fileType: DetectedFileType): boolean {
  return (
    fileType === 'mp3' ||
    fileType === 'm4a' ||
    fileType === 'wav' ||
    fileType === 'webm'
  );
}

const CANONICAL_MIME_BY_FILE_TYPE: Record<
  Exclude<DetectedFileType, 'unknown'>,
  string
> = {
  pdf: MIME_TYPES.PDF,
  docx: MIME_TYPES.DOCX,
  pptx: MIME_TYPES.PPTX,
  xlsx: MIME_TYPES.XLSX,
  xls: MIME_TYPES.XLS,
  csv: MIME_TYPES.CSV,
  txt: MIME_TYPES.TXT,
  mp3: MIME_TYPES.MP3,
  m4a: MIME_TYPES.M4A,
  wav: MIME_TYPES.WAV,
  webm: MIME_TYPES.WEBM,
};

/**
 * Get the canonical MIME type for a detected file type.
 * This ensures we use the correct MIME type regardless of what the browser sent.
 */
export function getCanonicalMimeType(
  fileType: DetectedFileType,
): string | null {
  if (fileType === 'unknown') return null;
  return CANONICAL_MIME_BY_FILE_TYPE[fileType];
}
