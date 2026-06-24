import {
  Paragraph,
  TextRun,
  ExternalHyperlink,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  TableLayoutType,
  UnderlineType,
  convertMillimetersToTwip,
  Packer,
  type IParagraphOptions,
  type IRunOptions,
} from 'docx';
import type { HTMLElement, TextNode } from 'node-html-parser';
import { parse, NodeType } from 'node-html-parser';

import { buildDocument } from './docx-document-config';

/** Inline formatting context accumulated while walking the tree. */
interface InlineContext {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
  link?: string;
}

type InlineChild = TextRun | ExternalHyperlink;
type BlockChild = Paragraph | Table;

const HEADING_MAP: Record<
  string,
  (typeof HeadingLevel)[keyof typeof HeadingLevel]
> = {
  h1: HeadingLevel.HEADING_1,
  h2: HeadingLevel.HEADING_2,
  h3: HeadingLevel.HEADING_3,
  h4: HeadingLevel.HEADING_4,
  h5: HeadingLevel.HEADING_5,
  h6: HeadingLevel.HEADING_6,
};

const ALIGNMENT_MAP: Record<
  string,
  (typeof AlignmentType)[keyof typeof AlignmentType]
> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
};

const TABLE_BORDER = {
  style: BorderStyle.SINGLE,
  size: 1,
  color: 'CCCCCC',
};

const TABLE_BORDERS = {
  top: TABLE_BORDER,
  bottom: TABLE_BORDER,
  left: TABLE_BORDER,
  right: TABLE_BORDER,
};

// A4 portrait usable width = 210mm page − 2×25mm margins (see docx-document-config.ts).
const TABLE_USABLE_WIDTH_TWIPS = convertMillimetersToTwip(210 - 2 * 25);

/**
 * Converts TipTap-generated HTML into a DOCX buffer using the `docx` library.
 *
 * Supported elements (matching the TipTap editor config):
 * - Headings: h1–h6, paragraphs with text-align
 * - Inline: strong/b, em/i, u, s/del/strike, code, a[href]
 * - Lists: ul, ol (including nested)
 * - Blockquotes, code blocks (pre > code), tables, hr
 */
export async function convertHtmlToDocx(html: string): Promise<Buffer> {
  const root = parse(html);
  const children = convertBlockNodes(root.childNodes as HTMLElement[]);
  const doc = buildDocument(children);
  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

// ---------------------------------------------------------------------------
// Block-level conversion
// ---------------------------------------------------------------------------

function convertBlockNodes(nodes: HTMLElement[]): BlockChild[] {
  const result: BlockChild[] = [];

  for (const node of nodes) {
    if (node.nodeType === NodeType.TEXT_NODE) {
      const text = (node as unknown as TextNode).text.trim();
      if (text) {
        result.push(
          new Paragraph({ style: 'Normal', children: [new TextRun(text)] }),
        );
      }
      continue;
    }

    if (node.nodeType !== NodeType.ELEMENT_NODE) continue;

    const tag = node.tagName.toLowerCase();
    result.push(...convertElement(node, tag));
  }

  return result;
}

function convertElement(node: HTMLElement, tag: string): BlockChild[] {
  if (tag in HEADING_MAP) {
    return [convertHeading(node, tag)];
  }

  switch (tag) {
    case 'p':
      return [convertParagraph(node)];
    case 'blockquote':
      return convertBlockquote(node);
    case 'pre':
      return [convertCodeBlock(node)];
    case 'ul':
      return convertList(node, false);
    case 'ol':
      return convertList(node, true);
    case 'table':
      return [convertTable(node)];
    case 'hr':
      return [new Paragraph({ thematicBreak: true })];
    case 'br':
      return [new Paragraph({ children: [] })];
    default:
      return convertBlockNodes(node.childNodes as HTMLElement[]);
  }
}

function convertHeading(node: HTMLElement, tag: string): Paragraph {
  return new Paragraph({
    heading: HEADING_MAP[tag],
    alignment: parseAlignment(node),
    children: collectInlineRuns(node, {}),
  });
}

function convertParagraph(node: HTMLElement): Paragraph {
  return new Paragraph({
    style: 'Normal',
    alignment: parseAlignment(node),
    children: collectInlineRuns(node, {}),
  });
}

function convertBlockquote(node: HTMLElement): BlockChild[] {
  const blockquoteStyle = {
    indent: { left: convertMillimetersToTwip(10) },
    border: {
      left: {
        style: BorderStyle.SINGLE,
        size: 6,
        color: 'CCCCCC',
        space: 8,
      },
    },
  };
  const result: BlockChild[] = [];

  for (const child of node.childNodes as HTMLElement[]) {
    if (child.nodeType === NodeType.TEXT_NODE) {
      const text = (child as unknown as TextNode).text.trim();
      if (text) {
        result.push(
          new Paragraph({ ...blockquoteStyle, children: [new TextRun(text)] }),
        );
      }
    } else if (child.nodeType === NodeType.ELEMENT_NODE) {
      const tag = child.tagName.toLowerCase();
      if (tag === 'p') {
        result.push(
          new Paragraph({
            ...blockquoteStyle,
            alignment: parseAlignment(child),
            children: collectInlineRuns(child, {}),
          }),
        );
      } else {
        result.push(...convertElement(child, tag));
      }
    }
  }

  return result;
}

function convertCodeBlock(node: HTMLElement): Paragraph {
  const codeFont = { font: 'Courier New', size: 20 } as const;
  const children = node.text
    .split('\n')
    .map(
      (line: string, i: number) =>
        new TextRun({ text: line, ...codeFont, ...(i > 0 && { break: 1 }) }),
    );

  return new Paragraph({
    shading: { fill: 'F5F5F5' },
    spacing: { before: 80, after: 80 },
    children,
  });
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

function listProps(ordered: boolean, level: number): IParagraphOptions {
  return ordered
    ? { numbering: { reference: 'ordered-list', level } }
    : { bullet: { level } };
}

function convertList(
  node: HTMLElement,
  ordered: boolean,
  level = 0,
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  for (const li of node.querySelectorAll(':scope > li')) {
    convertListItem(li, ordered, level, paragraphs);
  }

  return paragraphs;
}

function convertListItem(
  li: HTMLElement,
  ordered: boolean,
  level: number,
  out: Paragraph[],
): void {
  for (const child of li.childNodes as HTMLElement[]) {
    const childTag = child.tagName ? child.tagName.toLowerCase() : undefined;

    if (childTag === 'ul' || childTag === 'ol') {
      out.push(...convertList(child, childTag === 'ol', level + 1));
    } else if (childTag === 'p') {
      out.push(
        new Paragraph({
          children: collectInlineRuns(child, {}),
          ...listProps(ordered, level),
        }),
      );
    } else if (child.nodeType === NodeType.TEXT_NODE) {
      const text = (child as unknown as TextNode).text.trim();
      if (text) {
        out.push(
          new Paragraph({
            children: [new TextRun(text)],
            ...listProps(ordered, level),
          }),
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

function convertTable(node: HTMLElement): Table {
  const rowElements = node.querySelectorAll(
    ':scope > tr, :scope > thead > tr, :scope > tbody > tr, :scope > tfoot > tr',
  );
  const columnCount = Math.max(1, countTableColumns(rowElements));
  const columnWidths = buildEqualColumnWidths(columnCount);
  const rows = rowElements
    .map(convertTableRow)
    .filter((r): r is TableRow => r !== null);

  if (rows.length === 0) {
    return new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [] })],
            }),
          ],
        }),
      ],
      columnWidths,
      layout: TableLayoutType.FIXED,
    });
  }

  return new Table({
    rows,
    columnWidths,
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

function countTableColumns(rowElements: HTMLElement[]): number {
  let max = 0;
  for (const tr of rowElements) {
    const cells = tr.querySelectorAll(':scope > td, :scope > th');
    let count = 0;
    for (const cell of cells) {
      const colspan = parseInt(cell.getAttribute('colspan') ?? '1', 10);
      count += Number.isFinite(colspan) && colspan > 0 ? colspan : 1;
    }
    if (count > max) max = count;
  }
  return max;
}

function buildEqualColumnWidths(columnCount: number): number[] {
  const width = Math.floor(TABLE_USABLE_WIDTH_TWIPS / columnCount);
  return Array.from({ length: columnCount }, () => width);
}

function convertTableRow(tr: HTMLElement): TableRow | null {
  const cellElements = tr.querySelectorAll(':scope > td, :scope > th');
  if (cellElements.length === 0) return null;

  const isHeader = cellElements[0].tagName.toLowerCase() === 'th';
  const cells = cellElements.map((cell) => {
    const runs = collectInlineRuns(cell, {
      bold: isHeader || undefined,
    });

    const colspanAttr = cell.getAttribute('colspan');
    const rowspanAttr = cell.getAttribute('rowspan');
    const columnSpan = colspanAttr ? parseInt(colspanAttr, 10) : undefined;
    const rowSpan = rowspanAttr ? parseInt(rowspanAttr, 10) : undefined;

    return new TableCell({
      children: [new Paragraph({ children: runs })],
      borders: TABLE_BORDERS,
      shading: isHeader ? { fill: 'F5F5F5' } : undefined,
      width: { size: 0, type: WidthType.AUTO },
      ...(columnSpan && columnSpan > 1 && { columnSpan }),
      ...(rowSpan && rowSpan > 1 && { rowSpan }),
    });
  });

  return new TableRow({ children: cells });
}

// ---------------------------------------------------------------------------
// Inline-level conversion
// ---------------------------------------------------------------------------

function collectInlineRuns(
  node: HTMLElement,
  ctx: InlineContext,
): InlineChild[] {
  const runs: InlineChild[] = [];

  for (const child of node.childNodes as HTMLElement[]) {
    if (child.nodeType === NodeType.TEXT_NODE) {
      pushTextRun(runs, (child as unknown as TextNode).text, ctx);
    } else if (child.nodeType === NodeType.ELEMENT_NODE) {
      processInlineElement(runs, child, ctx);
    }
  }

  return runs;
}

function pushTextRun(
  runs: InlineChild[],
  text: string,
  ctx: InlineContext,
): void {
  if (!text) return;
  const fmt = formatFromContext(ctx);

  if (ctx.link) {
    runs.push(
      new ExternalHyperlink({
        link: ctx.link,
        children: [
          new TextRun({
            text,
            ...fmt,
            color: '1A73E8',
            underline: { type: UnderlineType.SINGLE },
          }),
        ],
      }),
    );
  } else {
    runs.push(new TextRun({ text, ...fmt }));
  }
}

function processInlineElement(
  runs: InlineChild[],
  child: HTMLElement,
  ctx: InlineContext,
): void {
  const tag = child.tagName.toLowerCase();

  if (tag === 'br') {
    runs.push(new TextRun({ break: 1 }));
    return;
  }

  const newCtx = buildInlineContext(tag, child, ctx);
  runs.push(...collectInlineRuns(child, newCtx));
}

function buildInlineContext(
  tag: string,
  node: HTMLElement,
  ctx: InlineContext,
): InlineContext {
  const newCtx = { ...ctx };

  switch (tag) {
    case 'strong':
    case 'b':
      newCtx.bold = true;
      break;
    case 'em':
    case 'i':
      newCtx.italic = true;
      break;
    case 'u':
      newCtx.underline = true;
      break;
    case 's':
    case 'del':
    case 'strike':
      newCtx.strike = true;
      break;
    case 'code':
      newCtx.code = true;
      break;
    case 'a':
      newCtx.link = node.getAttribute('href') ?? undefined;
      break;
  }

  return newCtx;
}

function formatFromContext(ctx: InlineContext): Partial<IRunOptions> {
  return {
    ...(ctx.bold && { bold: true }),
    ...(ctx.italic && { italics: true }),
    ...(ctx.underline && { underline: { type: UnderlineType.SINGLE } }),
    ...(ctx.strike && { strike: true }),
    ...(ctx.code && { font: 'Courier New', size: 20 }),
  };
}

function parseAlignment(
  node: HTMLElement,
): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
  const style = node.getAttribute('style') ?? '';
  const match = /text-align:\s*(left|center|right|justify)/.exec(style);
  return match ? ALIGNMENT_MAP[match[1]] : undefined;
}
