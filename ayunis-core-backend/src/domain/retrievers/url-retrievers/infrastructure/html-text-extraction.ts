import type * as cheerio from 'cheerio';

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

const markBlockBoundaries = ($: cheerio.CheerioAPI): void => {
  $('br').replaceWith(CONTENT_BOUNDARY);
  $('td, th').each((_, element) => {
    $(element).append(' ');
  });
  $(BLOCK_ELEMENTS).each((_, element) => {
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

/**
 * Text of `roots` without the `boilerplate` elements and forms. A form that
 * contains headings or paragraphs is kept, because ASP.NET WebForms pages wrap
 * the whole page in one; this is decided before the boilerplate inside the
 * form (such as its header) is removed.
 */
const textWithout = (
  $: cheerio.CheerioAPI,
  roots: Selection,
  boilerplate: string,
): string => {
  const copy = roots.clone();
  copy
    .find('form')
    .filter((_, form) => $(form).find(PROSE_ELEMENTS).length === 0)
    .remove();
  copy.find(boilerplate).remove();
  return normalizeExtractedText(copy.text());
};

/**
 * Convert an HTML document into line-addressable plain text of its main
 * content. Pages with a `<main>` (or, failing that, `<article>`) landmark yield
 * only that landmark; other pages drop navigation, header, footer, aside,
 * forms and dialogs. Falls back to the whole body when the stripped text is
 * empty. Mutates the document, so extract links before calling this.
 */
export const extractMainContentText = ($: cheerio.CheerioAPI): string => {
  $(NON_CONTENT_ELEMENTS).remove();
  markBlockBoundaries($);
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
