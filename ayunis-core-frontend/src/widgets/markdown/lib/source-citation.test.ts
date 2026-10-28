import { describe, expect, it } from 'vitest';
import {
  parseSourceCitationMarker,
  splitSourceCitationMarkers,
} from './source-citation';

const CHUNK_ID = '123e4567-e89b-12d3-a456-426614174000';

describe('parseSourceCitationMarker', () => {
  it('parses canonical UUIDs case-insensitively and preserves the label', () => {
    expect(
      parseSourceCitationMarker(
        '{{source:123E4567-E89B-12D3-A456-426614174000|Quelle 1: Satz 2.}}',
      ),
    ).toEqual({
      chunkId: '123E4567-E89B-12D3-A456-426614174000',
      label: 'Quelle 1: Satz 2.',
    });
  });

  it.each([
    '{{source:123e4567e89b12d3a456426614174000|Quelle}}',
    '{{source:not-a-uuid|Quelle}}',
    '{{source:123e4567-e89b-12d3-a456-42661417400g|Quelle}}',
    '{{source:123e4567-e89b-12d3-a456-4266141740000|Quelle}}',
  ])('rejects a malformed chunk id in %s', (marker) => {
    expect(parseSourceCitationMarker(marker)).toBeNull();
  });

  it.each([
    `{{source:${CHUNK_ID}|}}`,
    `{{source:${CHUNK_ID}|first|second}}`,
    `{{source:${CHUNK_ID}|left{right}}}`,
    `{{source:${CHUNK_ID}|left}right}}`,
    `{{source:${CHUNK_ID}|first\nsecond}}`,
    `{{source:${CHUNK_ID}|first\rsecond}}`,
    `{{source:${CHUNK_ID}|${'a'.repeat(201)}}}`,
  ])('rejects an invalid label in %s', (marker) => {
    expect(parseSourceCitationMarker(marker)).toBeNull();
  });

  it('accepts a 200-character label', () => {
    expect(
      parseSourceCitationMarker(`{{source:${CHUNK_ID}|${'a'.repeat(200)}}}`),
    ).toEqual({ chunkId: CHUNK_ID, label: 'a'.repeat(200) });
  });
});

describe('splitSourceCitationMarkers', () => {
  it('splits valid markers while preserving surrounding text', () => {
    expect(
      splitSourceCitationMarkers(`See {{source:${CHUNK_ID}|the source}}.`),
    ).toEqual([
      { kind: 'text', text: 'See ' },
      {
        kind: 'citation',
        citation: { chunkId: CHUNK_ID, label: 'the source' },
      },
      { kind: 'text', text: '.' },
    ]);
  });

  it.each([
    `{{source:${CHUNK_ID}|unfinished`,
    `{{{source:${CHUNK_ID}|extra opening brace}}}`,
    `{{source:${CHUNK_ID}|extra closing brace}}}`,
  ])('preserves incomplete and extra-braced markers literally', (text) => {
    expect(splitSourceCitationMarkers(text)).toEqual([{ kind: 'text', text }]);
  });
});
