import './document-fonts.css';
import type { DocumentTypographyDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export type DocumentTypography = DocumentTypographyDto;
export type DocumentFontFamily = NonNullable<DocumentTypography['fontFamily']>;

export const DOCUMENT_FONT_STACKS: Record<DocumentFontFamily, string> = {
  Arial: 'Arial, Helvetica, "Liberation Sans", sans-serif',
  'Times New Roman': '"Times New Roman", "Liberation Serif", serif',
  'Courier New': '"Courier New", "Liberation Mono", monospace',
  Calibri: 'Calibri, Carlito, sans-serif',
  Cambria: 'Cambria, Caladea, serif',
  Georgia: 'Georgia, Gelasio, serif',
  Roboto: '"Roboto", sans-serif',
  'Open Sans': '"Open Sans", sans-serif',
  Lato: '"Lato", sans-serif',
  Montserrat: '"Montserrat", sans-serif',
  Inter: '"Inter", sans-serif',
  'Noto Sans': '"Noto Sans", sans-serif',
  'Source Sans 3': '"Source Sans 3", sans-serif',
  'Noto Serif': '"Noto Serif", serif',
  'Fira Sans': '"Fira Sans", sans-serif',
};

export const MIN_DOCUMENT_FONT_SIZE_PT = 6;
export const MAX_DOCUMENT_FONT_SIZE_PT = 72;

export const EMPTY_DOCUMENT_TYPOGRAPHY: DocumentTypography = {
  fontFamily: null,
  fontSizePt: null,
};

export function appendLetterheadTypography(
  formData: FormData,
  typography: Partial<DocumentTypography>,
): void {
  const { fontFamily, fontSizePt } = typography;
  if (fontFamily !== undefined) {
    formData.append('fontFamily', fontFamily ?? '');
  }
  if (fontSizePt !== undefined) {
    formData.append(
      'fontSizePt',
      fontSizePt === null ? '' : String(fontSizePt),
    );
  }
}
