import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { DocumentFontFamily } from 'src/domain/letterheads/domain/value-objects/document-typography';

const FONT_PACKAGES: Partial<Record<DocumentFontFamily, string>> = {
  Calibri: '@fontsource/carlito',
  Cambria: '@fontsource/caladea',
  Georgia: '@fontsource/gelasio',
  Roboto: '@fontsource/roboto',
  'Open Sans': '@fontsource/open-sans',
  Lato: '@fontsource/lato',
  Montserrat: '@fontsource/montserrat',
  Inter: '@fontsource/inter',
  'Noto Sans': '@fontsource/noto-sans',
  'Source Sans 3': '@fontsource/source-sans-3',
  'Noto Serif': '@fontsource/noto-serif',
  'Fira Sans': '@fontsource/fira-sans',
};
const FONT_STYLES = ['400', '400-italic', '700', '700-italic'] as const;
const FONT_SOURCE =
  /url\(\.\/files\/([\w-]+\.woff2)\) format\('woff2'\), url\(\.\/files\/[\w-]+\.woff\) format\('woff'\)/g;
const embeddedCss = new Map<DocumentFontFamily, string>();

export function bundledDocumentFontCss(family: DocumentFontFamily): string {
  const fontPackage = FONT_PACKAGES[family];
  if (!fontPackage) return '';

  const cached = embeddedCss.get(family);
  if (cached) return cached;

  const css = FONT_STYLES.map((style) => {
    const stylesheet = require.resolve(`${fontPackage}/${style}.css`);
    const fontDirectory = join(dirname(stylesheet), 'files');

    // PDF export blocks external requests, including stylesheet assets.
    return readFileSync(stylesheet, 'utf8').replace(
      FONT_SOURCE,
      (_source, file: string) =>
        `url(data:font/woff2;base64,${readFileSync(join(fontDirectory, file), 'base64')}) format('woff2')`,
    );
  }).join('\n');

  embeddedCss.set(family, css);
  return css;
}
