import { describe, expect, it } from 'vitest';
import { protectSourceCitationPipes } from './protect-source-citation-pipes';

const MARKER = '{{source:123e4567-e89b-12d3-a456-426614174000|Quelle}}';

describe('protectSourceCitationPipes', () => {
  it.each(['', 'Quelle', 'Quelle}'])(
    'protects the separator before a streamed label completes: %s',
    (label) => {
      const source = `{{source:123e4567-e89b-12d3-a456-426614174000|${label}`;
      const { markdown, separator } = protectSourceCitationPipes(source);
      expect(separator).toBeDefined();
      expect(markdown).toBe(source.replace('|', separator!));
    },
  );

  it.each([
    '{{source:not-a-uuid|Quelle',
    '{{{source:123e4567-e89b-12d3-a456-426614174000|Quelle',
    '{{source:123e4567-e89b-12d3-a456-426614174000\\|Quelle',
  ])(
    'leaves invalid prefixes and already escaped separators unchanged: %s',
    (source) => {
      expect(protectSourceCitationPipes(source)).toEqual({ markdown: source });
    },
  );

  it('uses a single character even alongside a long private-use character run', () => {
    const literal = '\uE000'.repeat(100_000);
    const { markdown, separator } = protectSourceCitationPipes(
      `${literal} ${MARKER}`,
    );
    expect(separator).toHaveLength(1);
    expect(separator).not.toBe('\uE000');
    expect(markdown).toBe(`${literal} ${MARKER.replace('|', separator!)}`);
  });

  it.each(['\uE000', '&#xE000;', '&#57344;', '%EE%80%80', '&#37;ee%80%80'])(
    'avoids collision with literal or encoded content: %s',
    (literal) => {
      const { markdown, separator } = protectSourceCitationPipes(
        `${literal} ${MARKER}`,
      );
      expect(separator).not.toBe('\uE000');
      expect(markdown.startsWith(`${literal} `)).toBe(true);
    },
  );
});
