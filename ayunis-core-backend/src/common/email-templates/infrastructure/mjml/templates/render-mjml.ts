import mjml2html from 'mjml';
import type { MJMLParseResults } from 'mjml-core';

export function renderMjml(source: string): MJMLParseResults {
  return mjml2html(source, { ignoreIncludes: true });
}
