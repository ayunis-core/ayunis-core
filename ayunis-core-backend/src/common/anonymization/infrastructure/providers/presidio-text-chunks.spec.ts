import { mergeChunkSpans, splitIntoChunks } from './presidio-text-chunks';

const codePoints = (text: string) => Array.from(text);

describe('splitIntoChunks', () => {
  it('returns the whole text as one chunk when it fits', () => {
    const chunks = splitIntoChunks(codePoints('Ich bin der Dani'), 100, 10);

    expect(chunks).toEqual([{ start: 0, end: 16, text: 'Ich bin der Dani' }]);
  });

  it('advances by the chunk length minus the overlap and ends at the text end', () => {
    const text = 'abcdefghijklmnopqrstuvwxyz';

    const chunks = splitIntoChunks(codePoints(text), 10, 4);

    expect(chunks).toEqual([
      { start: 0, end: 10, text: 'abcdefghij' },
      { start: 6, end: 16, text: 'ghijklmnop' },
      { start: 12, end: 22, text: 'mnopqrstuv' },
      { start: 18, end: 26, text: 'stuvwxyz' },
    ]);
  });

  it('measures chunk boundaries in code points, not UTF-16 units', () => {
    const chunks = splitIntoChunks(codePoints('😀😀😀😀😀😀'), 4, 1);

    expect(chunks).toEqual([
      { start: 0, end: 4, text: '😀😀😀😀' },
      { start: 3, end: 6, text: '😀😀😀' },
    ]);
  });

  // A cut inside a word shows the model a fragment ("senbau") that it can
  // flag as an entity of its own, which masks half a word for nothing. Cuts
  // and the following chunk's start move back to the nearest whitespace.
  it('moves a cut back to the last whitespace before the chunk length', () => {
    const text = 'alpha beta gamma delta';

    const chunks = splitIntoChunks(codePoints(text), 13, 4);

    expect(chunks).toEqual([
      { start: 0, end: 11, text: 'alpha beta ' },
      { start: 6, end: 17, text: 'beta gamma ' },
      { start: 11, end: 22, text: 'gamma delta' },
    ]);
  });

  it('cuts inside a word when no whitespace is near the chunk length', () => {
    const text = 'abcdefghijklmnopqrstuvwxyz';

    const chunks = splitIntoChunks(codePoints(text), 10, 4);

    expect(chunks[0]).toEqual({ start: 0, end: 10, text: 'abcdefghij' });
  });

  it('does not emit a trailing chunk that lies entirely inside the previous one', () => {
    const chunks = splitIntoChunks(codePoints('abcdefghijkl'), 10, 4);

    expect(chunks.map((chunk) => [chunk.start, chunk.end])).toEqual([
      [0, 10],
      [6, 12],
    ]);
  });
});

describe('mergeChunkSpans', () => {
  // Two chunks that overlap on "gh" [8, 10). Both chunk edges fall right
  // after or before whitespace, so nothing here is extended.
  const text = 'abc def gh ijk lmn';
  const points = codePoints(text);
  const chunks = [
    { start: 0, end: 10, text: text.slice(0, 10) },
    { start: 8, end: 18, text: text.slice(8, 18) },
  ];
  const person = (start: number, end: number) => ({
    start,
    end,
    entity_type: 'PERSON',
  });

  it('shifts spans to full-text offsets', () => {
    const merged = mergeChunkSpans(chunks, [[], [person(5, 7)]], points);

    expect(merged).toEqual([person(13, 15)]);
  });

  it('reports an entity both chunks saw whole once', () => {
    const merged = mergeChunkSpans(
      chunks,
      [[{ ...person(8, 10), score: 0.8 }], [{ ...person(0, 2), score: 0.9 }]],
      points,
    );

    expect(merged).toEqual([{ ...person(8, 10), score: 0.8 }]);
  });

  it('keeps the whole entity when the earlier chunk only saw its prefix', () => {
    const merged = mergeChunkSpans(
      chunks,
      [[person(8, 10)], [person(0, 6)]],
      points,
    );

    expect(merged).toEqual([person(8, 14)]);
  });

  it('keeps the whole entity when the later chunk only saw its suffix', () => {
    const merged = mergeChunkSpans(
      chunks,
      [[person(4, 10)], [person(0, 2)]],
      points,
    );

    expect(merged).toEqual([person(4, 10)]);
  });

  // An entity longer than the overlap is cut by both chunks: the earlier one
  // reports a prefix up to its edge, the later one a suffix from its edge.
  // Both pieces overlap inside the shared region, so their union is the
  // whole entity and nothing in between stays unmasked.
  it('joins the prefix and suffix of an entity longer than the overlap', () => {
    const merged = mergeChunkSpans(
      chunks,
      [[person(2, 10)], [person(0, 6)]],
      points,
    );

    expect(merged).toEqual([person(2, 14)]);
  });

  it('collapses nested spans of one type into the outermost', () => {
    const merged = mergeChunkSpans(
      [chunks[0]],
      [[person(2, 4), person(0, 6)]],
      points,
    );

    expect(merged).toEqual([person(0, 6)]);
  });

  // A union takes one entity type. Relabelling a name as the location it
  // overlaps would let a category-wide whitelist for locations exempt the
  // name, so spans of different types are never unioned.
  it('leaves overlapping spans of different types as they are', () => {
    const location = { start: 3, end: 9, entity_type: 'LOCATION' };

    const merged = mergeChunkSpans(
      [chunks[0]],
      [[person(2, 5), location]],
      points,
    );

    expect(merged).toEqual([person(2, 5), location]);
  });

  it('keeps disjoint spans apart', () => {
    const merged = mergeChunkSpans(
      [chunks[0]],
      [[person(0, 2), person(8, 10)]],
      points,
    );

    expect(merged).toEqual([person(0, 2), person(8, 10)]);
  });

  // A token longer than the overlap with no whitespace (a long URL) is cut
  // inside the token. The later chunk never sees "https://", so a recogniser
  // keyed on it reports nothing there; the prefix the earlier chunk reports
  // is extended through the token so its tail is masked too.
  describe('a cut inside a token longer than the overlap', () => {
    const url = 'https://x.y/' + 'q'.repeat(20);
    const long = `aa ${url} bb`;
    const longPoints = codePoints(long);
    const longChunks = splitIntoChunks(longPoints, 12, 4);
    const urlSpan = (start: number, end: number) => ({
      start,
      end,
      entity_type: 'URL',
    });

    it('is the case under test', () => {
      expect(longChunks[0]).toEqual({
        start: 0,
        end: 12,
        text: 'aa https://x',
      });
      expect(longChunks[1].start).toBe(8);
    });

    it('extends a span ending on the cut through the token', () => {
      const merged = mergeChunkSpans(
        longChunks,
        longChunks.map((chunk, index) =>
          index === 0 ? [urlSpan(3, chunk.end - chunk.start)] : [],
        ),
        longPoints,
      );

      expect(merged).toEqual([urlSpan(3, 3 + url.length)]);
    });

    it('extends a span starting on a mid-token chunk start back through the token', () => {
      const merged = mergeChunkSpans(
        longChunks,
        longChunks.map((chunk, index) =>
          index === 1 ? [urlSpan(0, chunk.end - chunk.start)] : [],
        ),
        longPoints,
      );

      expect(merged[0].start).toBe(3);
    });

    it('does not extend a span ending on a cut that falls on whitespace', () => {
      const merged = mergeChunkSpans(chunks, [[person(8, 10)], []], points);

      expect(merged).toEqual([person(8, 10)]);
    });
  });
});
