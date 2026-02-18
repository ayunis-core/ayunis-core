import {
  Document,
  type Paragraph,
  type Table,
  AlignmentType,
  LevelFormat,
  convertMillimetersToTwip,
} from 'docx';

type BlockChild = Paragraph | Table;

const PAGE_MARGIN_MM = 25;

const ORDERED_LIST_LEVELS = [
  { level: 0, format: LevelFormat.DECIMAL, text: '%1.' },
  { level: 1, format: LevelFormat.LOWER_LETTER, text: '%2.' },
  { level: 2, format: LevelFormat.LOWER_ROMAN, text: '%3.' },
  { level: 3, format: LevelFormat.DECIMAL, text: '%4.' },
  { level: 4, format: LevelFormat.LOWER_LETTER, text: '%5.' },
].map((l) => ({ ...l, alignment: AlignmentType.START }));

export function buildDocument(children: BlockChild[]): Document {
  return new Document({
    numbering: {
      config: [{ reference: 'ordered-list', levels: ORDERED_LIST_LEVELS }],
    },
    styles: buildStyles(),
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertMillimetersToTwip(PAGE_MARGIN_MM),
              right: convertMillimetersToTwip(PAGE_MARGIN_MM),
              bottom: convertMillimetersToTwip(PAGE_MARGIN_MM),
              left: convertMillimetersToTwip(PAGE_MARGIN_MM),
            },
          },
        },
        children,
      },
    ],
  });
}

function buildStyles() {
  return {
    default: {
      document: {
        run: { font: 'Arial', size: 24 },
        paragraph: { spacing: { after: 160, line: 360 } },
      },
      heading1: {
        run: { size: 40, bold: true, font: 'Arial' },
        paragraph: { spacing: { before: 240, after: 120 } },
      },
      heading2: {
        run: { size: 32, bold: true, font: 'Arial' },
        paragraph: { spacing: { before: 200, after: 100 } },
      },
      heading3: {
        run: { size: 28, bold: true, font: 'Arial' },
        paragraph: { spacing: { before: 160, after: 80 } },
      },
    },
    paragraphStyles: [
      {
        id: 'Normal',
        name: 'Normal',
        run: { font: 'Arial', size: 24, bold: false },
        paragraph: { spacing: { after: 160, line: 360 } },
      },
    ],
  };
}
