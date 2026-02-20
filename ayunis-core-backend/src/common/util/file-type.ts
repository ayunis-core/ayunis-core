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
} as const;

export type DetectedFileType =
  | 'pdf'
  | 'docx'
  | 'pptx'
  | 'xlsx'
  | 'xls'
  | 'csv'
  | 'unknown';

/** Lookup: MIME type → detected file type */
const MIME_TO_FILE_TYPE: Record<string, DetectedFileType> = {
  [MIME_TYPES.PDF]: 'pdf',
  [MIME_TYPES.DOCX]: 'docx',
  [MIME_TYPES.PPTX]: 'pptx',
  [MIME_TYPES.XLSX]: 'xlsx',
  [MIME_TYPES.CSV]: 'csv',
  // Note: MIME_TYPES.XLS is intentionally excluded — XLS MIME can also indicate CSV files
};

/** Lookup: file extension → detected file type */
const EXT_TO_FILE_TYPE: Record<string, DetectedFileType> = {
  [FILE_EXTENSIONS.PDF]: 'pdf',
  [FILE_EXTENSIONS.DOCX]: 'docx',
  [FILE_EXTENSIONS.PPTX]: 'pptx',
  [FILE_EXTENSIONS.XLSX]: 'xlsx',
  [FILE_EXTENSIONS.XLS]: 'xls',
  [FILE_EXTENSIONS.CSV]: 'csv',
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
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- lookup returns undefined for unknown keys at runtime
  return MIME_TO_FILE_TYPE[mimetype] ?? EXT_TO_FILE_TYPE[ext] ?? 'unknown';
}

/**
 * Check if the file type is a document that should be processed through Docling
 * (PDF, Word, PowerPoint)
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
 * Get the canonical MIME type for a detected file type.
 * This ensures we use the correct MIME type regardless of what the browser sent.
 */
export function getCanonicalMimeType(
  fileType: DetectedFileType,
): string | null {
  switch (fileType) {
    case 'pdf':
      return MIME_TYPES.PDF;
    case 'docx':
      return MIME_TYPES.DOCX;
    case 'pptx':
      return MIME_TYPES.PPTX;
    case 'xlsx':
      return MIME_TYPES.XLSX;
    case 'xls':
      return MIME_TYPES.XLS;
    case 'csv':
      return MIME_TYPES.CSV;
    case 'unknown':
      return null;
  }
}
