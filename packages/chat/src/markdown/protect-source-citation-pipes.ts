import { findSourceCitationPipeOffsets } from './source-citation';

export function protectSourceCitationPipes(source: string): {
  markdown: string;
  separator?: string;
} {
  const offsets = findSourceCitationPipeOffsets(source);
  if (offsets.length === 0) return { markdown: source };

  const decoded = source.replace(
    /&#(x[\da-f]+|\d+);?/gi,
    (entity, number: string) => {
      const code =
        number[0].toLowerCase() === 'x'
          ? Number.parseInt(number.slice(1), 16)
          : Number.parseInt(number, 10);
      return code <= 0x10ffff ? String.fromCodePoint(code) : entity;
    },
  );
  const separator = chooseSeparator(decoded);

  let markdown = source;
  // GFM splits cells before inline parsing, including while a marker is streaming.
  for (const offset of [...offsets].reverse()) {
    markdown =
      markdown.slice(0, offset) + separator + markdown.slice(offset + 1);
  }
  return { markdown, separator };
}

function chooseSeparator(decoded: string): string {
  const characters = new Set(decoded);
  for (const match of decoded.matchAll(
    /%(?:EE|EF)%[89AB][\dA-F]%[89AB][\dA-F]/gi,
  )) {
    characters.add(decodeURIComponent(match[0]));
  }
  let code = 0xe000;
  while (characters.has(String.fromCodePoint(code))) code++;
  return String.fromCodePoint(code);
}
