export const DOCUMENT_FONT_FAMILIES = [
  'Arial',
  'Times New Roman',
  'Courier New',
  'Calibri',
  'Cambria',
  'Georgia',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Inter',
  'Noto Sans',
  'Source Sans 3',
  'Noto Serif',
  'Fira Sans',
] as const;

export type DocumentFontFamily = (typeof DOCUMENT_FONT_FAMILIES)[number];

export const MIN_DOCUMENT_FONT_SIZE_PT = 6;
export const MAX_DOCUMENT_FONT_SIZE_PT = 72;

export interface DocumentTypography {
  fontFamily: DocumentFontFamily | null;
  fontSizePt: number | null;
}
