export type DocumentFileType =
  | 'pdf'
  | 'docx'
  | 'pptx'
  | 'xlsx'
  | 'csv'
  | 'md'
  | 'txt'
  | 'eml'
  | 'mp3'
  | 'm4a'
  | 'wav'
  | 'webm';

export type DocumentStatus = 'ready' | 'processing' | 'failed';

export interface DocumentSourceHit {
  id: string;
  kind: 'document';
  title: string;
  location: string;
  page: number;
  pageCount: number;
  heading: string;
  passage: string;
  fileType?: DocumentFileType;
  status?: DocumentStatus;
  processingError?: string;
  extractedText?: string;
  columns?: string[];
  rowCount?: number;
}

export interface WebSourceHit {
  id: string;
  kind: 'web';
  title: string;
  siteName: string;
  url: string;
  retrievedAt: string;
  passage: string;
  body?: string[];
  status?: DocumentStatus;
  processingError?: string;
  crawledFrom?: string;
  crawlDepth?: number;
}

export type SourceHit = DocumentSourceHit | WebSourceHit;

const PAGINATED: DocumentFileType[] = ['pdf', 'docx', 'pptx'];
const TABULAR: DocumentFileType[] = ['xlsx', 'csv'];
const AUDIO: DocumentFileType[] = ['mp3', 'm4a', 'wav', 'webm'];
const PLAIN_TEXT: DocumentFileType[] = ['txt', 'md', 'eml'];

export function isPaginated(hit: DocumentSourceHit): boolean {
  return PAGINATED.includes(hit.fileType ?? 'pdf');
}

export function isTabular(hit: DocumentSourceHit): boolean {
  return TABULAR.includes(hit.fileType ?? 'pdf');
}

export function isAudio(hit: DocumentSourceHit): boolean {
  return AUDIO.includes(hit.fileType ?? 'pdf');
}

export function isPlainText(hit: DocumentSourceHit): boolean {
  return PLAIN_TEXT.includes(hit.fileType ?? 'pdf');
}
