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

  // PDF
  if (mimetype === MIME_TYPES.PDF || ext === FILE_EXTENSIONS.PDF) {
    return 'pdf';
  }

  // Word (DOCX)
  if (mimetype === MIME_TYPES.DOCX || ext === FILE_EXTENSIONS.DOCX) {
    return 'docx';
  }

  // PowerPoint (PPTX)
  if (mimetype === MIME_TYPES.PPTX || ext === FILE_EXTENSIONS.PPTX) {
    return 'pptx';
  }

  // Excel (XLSX/XLS)
  // Note: application/vnd.ms-excel can be sent for both .xls and .csv files
  if (mimetype === MIME_TYPES.XLSX) {
    return 'xlsx';
  }
  if (
    mimetype === MIME_TYPES.XLS &&
    (ext === FILE_EXTENSIONS.XLS || ext === FILE_EXTENSIONS.XLSX)
  ) {
    return ext === FILE_EXTENSIONS.XLSX ? 'xlsx' : 'xls';
  }

  // CSV
  // Note: Some browsers (e.g., Firefox) send application/vnd.ms-excel for CSV files
  if (
    mimetype === MIME_TYPES.CSV ||
    (mimetype === MIME_TYPES.XLS && ext === FILE_EXTENSIONS.CSV)
  ) {
    return 'csv';
  }

  return 'unknown';
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
    default:
      return null;
  }
}
