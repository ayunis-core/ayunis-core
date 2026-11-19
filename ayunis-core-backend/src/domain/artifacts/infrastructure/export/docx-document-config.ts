import {
  Document,
  Header,
  HorizontalPositionRelativeFrom,
  ImageRun,
  Paragraph,
  type Table,
  AlignmentType,
  LevelFormat,
  TextWrappingType,
  VerticalPositionRelativeFrom,
  convertMillimetersToTwip,
} from 'docx';
import { A4_PAGE_MM, type DocxLetterhead } from './docx-letterhead';
import type { DocumentTypography } from 'src/domain/letterheads/domain/value-objects/document-typography';

type BlockChild = Paragraph | Table;

const DEFAULT_MARGINS_MM = { top: 25, right: 25, bottom: 25, left: 25 };
const CSS_PIXELS_PER_MM = 96 / 25.4;

const ORDERED_LIST_LEVELS = [
  { level: 0, format: LevelFormat.DECIMAL, text: '%1.' },
  { level: 1, format: LevelFormat.LOWER_LETTER, text: '%2.' },
  { level: 2, format: LevelFormat.LOWER_ROMAN, text: '%3.' },
  { level: 3, format: LevelFormat.DECIMAL, text: '%4.' },
  { level: 4, format: LevelFormat.LOWER_LETTER, text: '%5.' },
].map((l) => ({ ...l, alignment: AlignmentType.START }));

export function buildDocument(
  children: BlockChild[],
  letterhead?: DocxLetterhead,
  typography?: DocumentTypography,
): Document {
  return new Document({
    numbering: {
      config: [{ reference: 'ordered-list', levels: ORDERED_LIST_LEVELS }],
    },
    styles: buildStyles(typography),
    sections: [
      {
        properties: buildSectionProperties(letterhead),
        headers: letterhead && buildLetterheadHeaders(letterhead),
        children,
      },
    ],
  });
}

export function docxContentWidthTwips(letterhead?: DocxLetterhead): number {
  const { left, right } = letterhead?.margins ?? DEFAULT_MARGINS_MM;
  return convertMillimetersToTwip(A4_PAGE_MM.width - left - right);
}

function buildSectionProperties(letterhead?: DocxLetterhead) {
  const { top, right, bottom, left } =
    letterhead?.margins ?? DEFAULT_MARGINS_MM;
  return {
    titlePage: letterhead?.continuationPagePng ? true : undefined,
    page: {
      size: letterhead && {
        width: convertMillimetersToTwip(A4_PAGE_MM.width),
        height: convertMillimetersToTwip(A4_PAGE_MM.height),
      },
      margin: {
        top: convertMillimetersToTwip(top),
        right: convertMillimetersToTwip(right),
        bottom: convertMillimetersToTwip(bottom),
        left: convertMillimetersToTwip(left),
        header: letterhead ? 0 : undefined,
      },
    },
  };
}

function buildLetterheadHeaders({
  firstPagePng,
  continuationPagePng,
}: DocxLetterhead) {
  return continuationPagePng
    ? {
        first: backgroundHeader(firstPagePng),
        default: backgroundHeader(continuationPagePng),
      }
    : { default: backgroundHeader(firstPagePng) };
}

function backgroundHeader(data: Buffer): Header {
  const artwork = new ImageRun({
    type: 'png',
    data,
    transformation: {
      width: Math.round(A4_PAGE_MM.width * CSS_PIXELS_PER_MM),
      height: Math.round(A4_PAGE_MM.height * CSS_PIXELS_PER_MM),
    },
    floating: {
      horizontalPosition: {
        relative: HorizontalPositionRelativeFrom.PAGE,
        offset: 0,
      },
      verticalPosition: {
        relative: VerticalPositionRelativeFrom.PAGE,
        offset: 0,
      },
      behindDocument: true,
      allowOverlap: true,
      wrap: { type: TextWrappingType.NONE },
    },
  });
  return new Header({ children: [new Paragraph({ children: [artwork] })] });
}

function buildStyles(typography?: DocumentTypography) {
  const font = typography?.fontFamily ?? 'Arial';
  const bodyRun = { font, size: (typography?.fontSizePt ?? 12) * 2 };
  return {
    default: {
      document: {
        run: bodyRun,
        paragraph: { spacing: { after: 160, line: 360 } },
      },
      heading1: {
        run: { size: 40, bold: true, font },
        paragraph: { spacing: { before: 240, after: 120 } },
      },
      heading2: {
        run: { size: 32, bold: true, font },
        paragraph: { spacing: { before: 200, after: 100 } },
      },
      heading3: {
        run: { size: 28, bold: true, font },
        paragraph: { spacing: { before: 160, after: 80 } },
      },
    },
    paragraphStyles: [
      {
        id: 'Normal',
        name: 'Normal',
        run: { ...bodyRun, bold: false },
        paragraph: { spacing: { after: 160, line: 360 } },
      },
    ],
  };
}
