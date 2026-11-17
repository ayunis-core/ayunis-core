import type * as cheerio from 'cheerio';
import { load } from 'cheerio';

const HTML_ENCODING_SCAN_BYTES = 1024;

const encodingFromBom = (buffer: Buffer): string | undefined => {
  if (buffer.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) {
    return 'utf-8';
  }
  if (buffer.subarray(0, 2).equals(Buffer.from([0xff, 0xfe]))) {
    return 'utf-16le';
  }
  if (buffer.subarray(0, 2).equals(Buffer.from([0xfe, 0xff]))) {
    return 'utf-16be';
  }
  return undefined;
};

const encodingFromMeta = (buffer: Buffer): string | undefined => {
  // HTML encoding declarations must occur early in the document, so bound the
  // byte-level scan before decoding potentially large uploads.
  const prefix = buffer
    .subarray(0, HTML_ENCODING_SCAN_BYTES)
    .toString('latin1');
  const $ = load(prefix);
  for (const meta of $('meta').toArray()) {
    const directCharset = $(meta).attr('charset');
    const isContentType =
      $(meta).attr('http-equiv')?.trim().toLowerCase() === 'content-type';
    const content = isContentType ? $(meta).attr('content') : undefined;
    const charset =
      directCharset ??
      /\bcharset\s*=\s*["']?([a-z0-9._:-]+)/i.exec(content ?? '')?.[1];
    if (charset) {
      return charset.toLowerCase().startsWith('utf-16') ? 'utf-8' : charset;
    }
  }
  return undefined;
};

export const decodeHtmlDocument = (buffer: Buffer): string => {
  const encoding =
    encodingFromBom(buffer) ?? encodingFromMeta(buffer) ?? 'utf-8';
  try {
    return new TextDecoder(encoding).decode(buffer).replace(/^\uFEFF/, '');
  } catch {
    return buffer.toString('utf8').replace(/^\uFEFF/, '');
  }
};

const NON_CONTENT_ELEMENTS =
  'script, style, meta, link, noscript, template, iframe, canvas';
const CONTENT_BOUNDARY = '\u001e';
const BLOCK_ELEMENTS = [
  'address',
  'article',
  'aside',
  'blockquote',
  'details',
  'dialog',
  'div',
  'dl',
  'dt',
  'dd',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'summary',
  'table',
  'tr',
  'ul',
].join(', ');
const MAIN_CONTENT_LANDMARKS = ['main, [role="main"]', 'article'];
const NAVIGATION_ELEMENTS = [
  'nav',
  'aside',
  'dialog',
  '[role="navigation"]',
  '[role="complementary"]',
  '[role="search"]',
  '[role="dialog"]',
  '[role="alertdialog"]',
].join(', ');
const PAGE_CHROME_ELEMENTS = [
  NAVIGATION_ELEMENTS,
  'header',
  'footer',
  '[role="banner"]',
  '[role="contentinfo"]',
].join(', ');
const PROSE_ELEMENTS = 'h1, h2, h3, h4, h5, h6, p';
// A landmark carrying less than this share of the page's non-boilerplate text
// is more likely a teaser widget than the page's actual content.
const MIN_LANDMARK_TEXT_SHARE = 1 / 3;

const select = ($: cheerio.CheerioAPI, selector: string) => $(selector);
type Selection = ReturnType<typeof select>;

const normalizeExtractedText = (text: string): string =>
  text
    .split(CONTENT_BOUNDARY)
    .map((block) => block.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');

const prepareDocument = ($: cheerio.CheerioAPI): void => {
  $(NON_CONTENT_ELEMENTS).remove();
  $('td br, th br').replaceWith(' ');
  $('br').replaceWith(CONTENT_BOUNDARY);
  $('td, th').each((_, element) => {
    $(element).append(' ');
  });
  $(BLOCK_ELEMENTS)
    .filter((_, element) => $(element).parents('td, th').length === 0)
    .each((_, element) => {
      $(element).prepend(CONTENT_BOUNDARY);
      $(element).append(CONTENT_BOUNDARY);
    });
};

const outermost = ($: cheerio.CheerioAPI, selector: string): Selection =>
  select($, selector).filter(
    (_, element) => $(element).parents(selector).length === 0,
  );

const findMainContent = ($: cheerio.CheerioAPI): Selection | null => {
  for (const selector of MAIN_CONTENT_LANDMARKS) {
    const landmarks = outermost($, selector);
    if (landmarks.length > 0) return landmarks;
  }
  return null;
};

const textWithout = (
  $: cheerio.CheerioAPI,
  roots: Selection,
  boilerplate: string,
): string => {
  const copy = roots.clone();
  // ASP.NET WebForms can wrap the whole page in a form, so preserve forms that
  // contain prose while still removing ordinary input-only forms.
  copy
    .find('form')
    .filter((_, form) => $(form).find(PROSE_ELEMENTS).length === 0)
    .remove();
  copy.find(boilerplate).remove();
  return normalizeExtractedText(copy.text());
};

export const extractHtmlDocumentText = ($: cheerio.CheerioAPI): string => {
  prepareDocument($);
  return normalizeExtractedText(select($, 'body').text());
};

export const extractMainContentText = ($: cheerio.CheerioAPI): string => {
  prepareDocument($);
  const body = select($, 'body');
  const pageText = textWithout($, body, PAGE_CHROME_ELEMENTS);
  const landmarks = findMainContent($);
  const landmarkText = landmarks
    ? textWithout($, landmarks, NAVIGATION_ELEMENTS)
    : '';
  if (
    landmarkText &&
    landmarkText.length >= pageText.length * MIN_LANDMARK_TEXT_SHARE
  ) {
    return landmarkText;
  }
  return pageText || normalizeExtractedText(body.text());
};
