import { RecursiveSplitterHandler } from './recursive.splitter';
import type { SplitterInput } from '../../application/ports/splitter.handler';
import type { TextChunk } from '../../domain/split-result.entity';

describe('RecursiveSplitterHandler', () => {
  let handler: RecursiveSplitterHandler;

  beforeEach(() => {
    handler = new RecursiveSplitterHandler();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should always be available', () => {
    expect(handler.isAvailable()).toBe(true);
  });

  describe('line number tracking', () => {
    it('should add line numbers to a single chunk (text smaller than chunk size)', () => {
      const input: SplitterInput = {
        text: 'Line 1\nLine 2\nLine 3',
        metadata: { chunkSize: 1000, chunkOverlap: 100 },
      };

      const result = handler.processText(input);

      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0].metadata).toMatchObject({
        index: 0,
        startLine: 1,
        endLine: 3,
        startCharOffset: 0,
        endCharOffset: 20,
      });
    });

    it('should calculate correct line numbers for multi-chunk text', () => {
      // Create text that will be split into multiple chunks
      const lines = [
        'Line 1: First line of content',
        'Line 2: Second line of content',
        'Line 3: Third line of content',
        'Line 4: Fourth line of content',
        'Line 5: Fifth line of content',
        'Line 6: Sixth line of content',
        'Line 7: Seventh line of content',
        'Line 8: Eighth line of content',
      ];
      const text = lines.join('\n');

      const input: SplitterInput = {
        text,
        metadata: { chunkSize: 100, chunkOverlap: 20 },
      };

      const result = handler.processText(input);

      // Should have multiple chunks
      expect(result.chunks.length).toBeGreaterThan(1);

      // First chunk should start at line 1
      expect(result.chunks[0].metadata.startLine).toBe(1);

      // Each chunk should have valid line numbers
      result.chunks.forEach((chunk) => {
        expect(chunk.metadata.startLine).toBeGreaterThanOrEqual(1);
        expect(chunk.metadata.endLine).toBeGreaterThanOrEqual(
          chunk.metadata.startLine as number,
        );
        expect(chunk.metadata.startCharOffset).toBeDefined();
        expect(chunk.metadata.endCharOffset).toBeDefined();
      });

      // Last chunk should end at or near the last line
      const lastChunk = result.chunks[result.chunks.length - 1];
      expect(lastChunk.metadata.endLine).toBe(lines.length);
    });

    it('should handle single line text', () => {
      const input: SplitterInput = {
        text: 'This is a single line without any newlines',
        metadata: { chunkSize: 1000, chunkOverlap: 100 },
      };

      const result = handler.processText(input);

      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0].metadata.startLine).toBe(1);
      expect(result.chunks[0].metadata.endLine).toBe(1);
    });

    it('should handle text with consecutive newlines (empty lines)', () => {
      const input: SplitterInput = {
        text: 'Line 1\n\nLine 3\n\n\nLine 6',
        metadata: { chunkSize: 1000, chunkOverlap: 100 },
      };

      const result = handler.processText(input);

      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0].metadata.startLine).toBe(1);
      expect(result.chunks[0].metadata.endLine).toBe(6);
    });

    it('should handle empty text', () => {
      const input: SplitterInput = {
        text: '',
        metadata: { chunkSize: 100, chunkOverlap: 20 },
      };

      const result = handler.processText(input);

      expect(result.chunks).toHaveLength(0);
    });

    it('should handle whitespace-only text', () => {
      const input: SplitterInput = {
        text: '   \n   \n   ',
        metadata: { chunkSize: 1000, chunkOverlap: 100 },
      };

      const result = handler.processText(input);

      // Whitespace-only chunks are trimmed and filtered out
      expect(result.chunks).toHaveLength(0);
    });

    it('should emit no chunks for whitespace-only text longer than the chunk size', () => {
      const input: SplitterInput = {
        // Tabs match no separator, so this would reach the fixed-size split
        text: '\t'.repeat(3000),
        metadata: { chunkSize: 1000, chunkOverlap: 100 },
      };

      const result = handler.processText(input);

      expect(result.chunks).toHaveLength(0);
    });

    it('should preserve chunk index in metadata', () => {
      const lines = Array.from(
        { length: 20 },
        (_, i) => `Line ${i + 1}: Some content here`,
      );
      const text = lines.join('\n');

      const input: SplitterInput = {
        text,
        metadata: { chunkSize: 100, chunkOverlap: 20 },
      };

      const result = handler.processText(input);

      // Verify each chunk has sequential index
      result.chunks.forEach((chunk, i) => {
        expect(chunk.metadata.index).toBe(i);
      });
    });

    it('should calculate character offsets correctly', () => {
      const input: SplitterInput = {
        text: 'AAAA\nBBBB\nCCCC',
        metadata: { chunkSize: 1000, chunkOverlap: 100 },
      };

      const result = handler.processText(input);

      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0].metadata.startCharOffset).toBe(0);
      expect(result.chunks[0].metadata.endCharOffset).toBe(14); // Length of "AAAA\nBBBB\nCCCC"
    });

    it('should handle text ending with newline', () => {
      const input: SplitterInput = {
        text: 'Line 1\nLine 2\n',
        metadata: { chunkSize: 1000, chunkOverlap: 100 },
      };

      const result = handler.processText(input);

      expect(result.chunks).toHaveLength(1);
      // The chunk includes the trailing newline but ends at the newline character
      // which is still considered part of line 2
      expect(result.chunks[0].metadata.startLine).toBe(1);
      expect(result.chunks[0].metadata.endLine).toBe(2);
    });

    it('should handle overlapping chunks with correct line numbers', () => {
      // Create content that will definitely overlap
      const paragraph1 = 'First paragraph with enough content to fill a chunk.';
      const paragraph2 =
        'Second paragraph with additional content for overlap testing.';
      const paragraph3 =
        'Third paragraph to ensure multiple chunks are created.';
      const text = `${paragraph1}\n\n${paragraph2}\n\n${paragraph3}`;

      const input: SplitterInput = {
        text,
        metadata: { chunkSize: 80, chunkOverlap: 20 },
      };

      const result = handler.processText(input);

      // With overlap, chunks may share content but line numbers should still be accurate
      expect(result.chunks.length).toBeGreaterThan(1);

      // Each chunk's start should be at or after the previous chunk's start
      for (let i = 1; i < result.chunks.length; i++) {
        const prevStart = result.chunks[i - 1].metadata
          .startCharOffset as number;
        const currStart = result.chunks[i].metadata.startCharOffset as number;
        expect(currStart).toBeGreaterThan(prevStart);
      }
    });

    it('should find line numbers even when overlap creates non-contiguous chunks', () => {
      // This tests the scenario where overlap text + content creates a string
      // that doesn't exist contiguously in the original
      const lines = [
        'Line 1: AAAAAAAAAA BBBBBBBBBB CCCCCCCCCC',
        'Line 2: DDDDDDDDDD EEEEEEEEEE FFFFFFFFFF',
        'Line 3: GGGGGGGGGG HHHHHHHHHH IIIIIIIIII',
        'Line 4: JJJJJJJJJJ KKKKKKKKKK LLLLLLLLLL',
      ];
      const text = lines.join('\n');

      const input: SplitterInput = {
        text,
        // Small chunk size to force multiple chunks with overlap
        metadata: { chunkSize: 50, chunkOverlap: 15 },
      };

      const result = handler.processText(input);

      // All chunks should have line numbers (not null)
      for (const chunk of result.chunks) {
        expect(chunk.metadata.startLine).toBeDefined();
        expect(chunk.metadata.startLine).not.toBeNull();
        expect(chunk.metadata.endLine).toBeDefined();
        expect(chunk.metadata.endLine).not.toBeNull();
        expect(chunk.metadata.startLine).toBeGreaterThanOrEqual(1);
        expect(chunk.metadata.endLine).toBeLessThanOrEqual(lines.length);
      }
    });
  });

  describe('configuration', () => {
    it('should honor chunkOverlap of 0 by emitting non-overlapping chunks', () => {
      const sentences = Array.from(
        { length: 20 },
        (_, i) => `Satz ${i + 1} mit etwas Inhalt.`,
      );
      const text = sentences.join(' ');

      const result = handler.processText({
        text,
        metadata: { chunkSize: 60, chunkOverlap: 0 },
      });

      expect(result.metadata.chunkOverlap).toBe(0);
      expect(result.chunks.length).toBeGreaterThan(1);
      for (let i = 1; i < result.chunks.length; i++) {
        const prevEnd = result.chunks[i - 1].metadata.endCharOffset as number;
        const currStart = result.chunks[i].metadata.startCharOffset as number;
        expect(currStart).toBeGreaterThanOrEqual(prevEnd);
      }
      for (const chunk of result.chunks) {
        const start = chunk.metadata.startCharOffset as number;
        const end = chunk.metadata.endCharOffset as number;
        expect(text.slice(start, end)).toBe(chunk.text);
      }
    });

    it('should derive a fitting default overlap when only a small chunkSize is given', () => {
      const sentences = Array.from(
        { length: 20 },
        (_, i) => `Satz ${i + 1} mit etwas Inhalt.`,
      );
      const text = sentences.join(' ');

      const result = handler.processText({
        text,
        metadata: { chunkSize: 100 },
      });

      // The built-in overlap default (200) exceeds this chunkSize; the
      // derived default keeps the built-in 20% ratio instead of rejecting
      // the caller's chunkSize.
      expect(result.metadata.chunkOverlap).toBe(20);
      expect(result.chunks.length).toBeGreaterThan(1);
      for (const chunk of result.chunks) {
        expect(chunk.text.length).toBeLessThanOrEqual(100);
      }
    });

    it.each([
      ['zero chunkSize', { chunkSize: 0, chunkOverlap: 0 }],
      ['negative chunkSize', { chunkSize: -5, chunkOverlap: 0 }],
      ['non-integer chunkSize', { chunkSize: 10.5, chunkOverlap: 0 }],
      ['negative chunkOverlap', { chunkSize: 100, chunkOverlap: -1 }],
      [
        'chunkOverlap equal to chunkSize',
        { chunkSize: 100, chunkOverlap: 100 },
      ],
      ['chunkOverlap above chunkSize', { chunkSize: 100, chunkOverlap: 150 }],
    ])('should reject invalid configuration: %s', (_label, metadata) => {
      expect(() =>
        handler.processText({ text: 'Some content to split.', metadata }),
      ).toThrow('Failed to process text with Recursive Text Splitter');
    });
  });

  describe('character offset tracking', () => {
    const expectOffsetsPointAtContent = (
      text: string,
      chunks: { text: string; metadata: Record<string, unknown> }[],
    ) => {
      for (const chunk of chunks) {
        const start = chunk.metadata.startCharOffset as number;
        const end = chunk.metadata.endCharOffset as number;
        expect(start).toBeGreaterThanOrEqual(0);
        expect(end).toBeGreaterThan(start);
        expect(end).toBeLessThanOrEqual(text.length);
        // The offset range covers the chunk's content: either the full chunk
        // text (offsets contiguous) or the content without the prepended
        // overlap — in both cases the slice is a suffix of the chunk text.
        expect(chunk.text.endsWith(text.slice(start, end))).toBe(true);
      }
    };

    it('should emit offsets whose slice matches the chunk content across split paths', () => {
      const paragraphs = Array.from(
        { length: 30 },
        (_, i) =>
          `Absatz ${i + 1}: ` +
          'Inhalt mit einigen Worten, Satzzeichen und etwas Länge. '.repeat(3),
      );
      const text = paragraphs.join('\n\n');

      const result = handler.processText({
        text,
        metadata: { chunkSize: 200, chunkOverlap: 50 },
      });

      expect(result.chunks.length).toBeGreaterThan(5);
      expectOffsetsPointAtContent(text, result.chunks);
    });

    it('should emit exact offsets for separator-free text (character split path)', () => {
      const text = 'X'.repeat(2500);

      const result = handler.processText({
        text,
        metadata: { chunkSize: 1000, chunkOverlap: 200 },
      });

      expect(
        result.chunks.map((chunk) => chunk.metadata.startCharOffset),
      ).toEqual([0, 800, 1600]);
      expect(
        result.chunks.map((chunk) => chunk.metadata.endCharOffset),
      ).toEqual([1000, 1800, 2500]);
      expectOffsetsPointAtContent(text, result.chunks);
    });

    it('should emit valid offsets when an oversized segment forces recursion with overlap seeding', () => {
      const text =
        'A'.repeat(10000) + '\n\n' + 'Ein normaler Absatz mit Inhalt.';

      const result = handler.processText({
        text,
        metadata: { chunkSize: 2000, chunkOverlap: 200 },
      });

      expectOffsetsPointAtContent(text, result.chunks);
    });

    it('should split a large document without quadratic position searching', () => {
      // ~1MB of unique words: every chunk exists verbatim in the text, but a
      // position search that rescans the document per chunk (the removed
      // findChunkPosition fallback) degrades to minutes on inputs like this.
      let text = '';
      let word = 0;
      while (text.length < 1_000_000) {
        text += `wort${word} `;
        word += 1;
        if (word % 100 === 0) {
          text += '\n';
        }
      }

      const startedAt = performance.now();
      const result = handler.processText({ text });
      const elapsedMs = performance.now() - startedAt;

      expect(result.chunks.length).toBeGreaterThan(500);
      expect(elapsedMs).toBeLessThan(2000);
      expectOffsetsPointAtContent(text, result.chunks);
    });
  });

  describe('chunk size enforcement', () => {
    it('should split an oversized leading segment instead of emitting it as a single chunk', () => {
      // Incident shape (AYC PDF ingestion): a huge separator-free block at the
      // start of the document, followed by a normal paragraph. The leading
      // segment used to bypass the size check and reach the embeddings API
      // as one ~500k-char input.
      const input: SplitterInput = {
        text: 'A'.repeat(10000) + '\n\n' + 'Ein normaler Absatz mit Inhalt.',
        metadata: { chunkSize: 2000, chunkOverlap: 200 },
      };

      const result = handler.processText(input);

      for (const chunk of result.chunks) {
        expect(chunk.text.length).toBeLessThanOrEqual(2000);
      }
    });

    it('should split an oversized trailing segment into chunks within the size limit', () => {
      const input: SplitterInput = {
        text: 'Ein normaler Absatz mit Inhalt.\n\n' + 'B'.repeat(10000),
        metadata: { chunkSize: 2000, chunkOverlap: 200 },
      };

      const result = handler.processText(input);

      for (const chunk of result.chunks) {
        expect(chunk.text.length).toBeLessThanOrEqual(2000);
      }
    });

    it('should split an oversized segment between paragraphs into chunks within the size limit', () => {
      const input: SplitterInput = {
        text:
          'Erster Absatz mit Inhalt.\n\n' +
          'C'.repeat(10000) +
          '\n\nZweiter Absatz mit Inhalt.',
        metadata: { chunkSize: 2000, chunkOverlap: 200 },
      };

      const result = handler.processText(input);

      for (const chunk of result.chunks) {
        expect(chunk.text.length).toBeLessThanOrEqual(2000);
      }
    });

    it('should preserve all document content when splitting oversized segments', () => {
      const input: SplitterInput = {
        text: 'D'.repeat(10000) + '\n\n' + 'Ein normaler Absatz mit Inhalt.',
        metadata: { chunkSize: 2000, chunkOverlap: 200 },
      };

      const result = handler.processText(input);

      const combined = result.chunks.map((chunk) => chunk.text).join('');
      const retainedDs = (combined.match(/D/g) ?? []).length;
      expect(retainedDs).toBeGreaterThanOrEqual(10000);
      expect(combined).toContain('Ein normaler Absatz mit Inhalt.');
    });

    it('should not emit chunks that only repeat the previous chunk overlap', () => {
      // An oversized segment carries its trailing separator into recursion;
      // the separator-only remainder splits must not surface as chunks whose
      // content is entirely carried-over overlap from the previous chunk.
      // Non-repetitive content so containment checks are meaningful.
      let giantBlock = '';
      let token = 0;
      while (giantBlock.length < 9000) {
        giantBlock += `tok${token}`;
        token += 1;
      }
      const input: SplitterInput = {
        text: giantBlock + '\n\n' + 'Ein normaler Absatz mit Inhalt.',
        metadata: { chunkSize: 2000, chunkOverlap: 200 },
      };

      const result = handler.processText(input);

      const chunks = result.chunks.map((chunk) => chunk.text);
      for (let i = 1; i < chunks.length; i++) {
        expect(chunks[i - 1]).not.toContain(chunks[i].trim());
      }
    });

    it('should respect the size limit with default chunk configuration', () => {
      const input: SplitterInput = {
        text:
          'Einleitung ohne Trennzeichenprobleme.\n\n' +
          'E'.repeat(5000) +
          '\n\nAbschluss des Dokuments.',
      };

      const result = handler.processText(input);

      for (const chunk of result.chunks) {
        expect(chunk.text.length).toBeLessThanOrEqual(1000);
      }
    });
  });

  describe('offset contract (property-based)', () => {
    // Deterministic LCG so every run tests the identical case sequence and a
    // failure is reproducible from the reported case index alone.
    const createNextInt = (initialSeed: number) => {
      let seed = initialSeed;
      return (min: number, max: number): number => {
        seed = (seed * 1103515245 + 12345) % 2 ** 31;
        return min + Math.floor((seed / 2 ** 31) * (max - min + 1));
      };
    };

    // Adversarial building blocks: separators of every level, separator-free
    // low-entropy runs (repeated chars, dot leaders, tabs), and multi-byte
    // characters.
    const TEXT_FRAGMENTS = [
      'wort',
      'Satz.',
      'Absatz!',
      ' ',
      '\n',
      '\n\n',
      '. ',
      ', ',
      '; ',
      '? ',
      '! ',
      '\t',
      'ÄÖÜäöüß',
      'A'.repeat(50),
      '.'.repeat(30),
      '   ',
      'x',
    ];

    const buildRandomText = (
      nextInt: (min: number, max: number) => number,
    ): string => {
      const fragmentCount = nextInt(1, 400);
      let text = '';
      for (let i = 0; i < fragmentCount; i++) {
        text += TEXT_FRAGMENTS[nextInt(0, TEXT_FRAGMENTS.length - 1)];
      }
      return text;
    };

    // Note: chunk starts are NOT required to be strictly increasing — with
    // overlap close to chunkSize, a chunk's carried overlap may legitimately
    // reach back past a smaller chunk emitted by a deeper recursion.
    const collectChunkViolations = (
      text: string,
      chunkSize: number,
      chunk: TextChunk,
    ): string[] => {
      const violations: string[] = [];
      const start = chunk.metadata.startCharOffset as number;
      const end = chunk.metadata.endCharOffset as number;
      const startLine = chunk.metadata.startLine as number;
      const endLine = chunk.metadata.endLine as number;

      if (chunk.text.length > chunkSize) {
        violations.push(`chunk exceeds size limit: ${chunk.text.length}`);
      }
      if (!(start >= 0 && end > start && end <= text.length)) {
        violations.push(`offsets out of bounds: [${start},${end})`);
      } else if (!chunk.text.endsWith(text.slice(start, end))) {
        violations.push(`slice [${start},${end}) does not match chunk text`);
      }
      if (!(startLine >= 1 && endLine >= startLine)) {
        violations.push(`invalid line range: ${startLine}-${endLine}`);
      }
      return violations;
    };

    const findUncoveredContentOffset = (
      text: string,
      chunks: TextChunk[],
    ): number | null => {
      const covered = new Uint8Array(text.length);
      for (const chunk of chunks) {
        const start = chunk.metadata.startCharOffset as number;
        const end = chunk.metadata.endCharOffset as number;
        covered.fill(1, Math.max(0, start), Math.max(0, end));
      }
      for (let offset = 0; offset < text.length; offset++) {
        if (covered[offset] === 0 && text[offset].trim().length > 0) {
          return offset;
        }
      }
      return null;
    };

    it('should uphold the offset contract across randomized inputs and configs', () => {
      const nextInt = createNextInt(20260722);

      for (let caseIndex = 0; caseIndex < 300; caseIndex++) {
        const text = buildRandomText(nextInt);
        const chunkSize = nextInt(1, 300);
        const chunkOverlap = nextInt(0, chunkSize - 1);

        const result = handler.processText({
          text,
          metadata: { chunkSize, chunkOverlap },
        });

        const violations = result.chunks.flatMap((chunk) =>
          collectChunkViolations(text, chunkSize, chunk),
        );
        const uncoveredOffset = findUncoveredContentOffset(text, result.chunks);
        if (uncoveredOffset !== null) {
          violations.push(`content at offset ${uncoveredOffset} not covered`);
        }

        // Case parameters are part of the compared object so a failure
        // reports which deterministic case broke the contract.
        expect({ caseIndex, chunkSize, chunkOverlap, violations }).toEqual({
          caseIndex,
          chunkSize,
          chunkOverlap,
          violations: [],
        });
      }
    });
  });

  describe('processText metadata', () => {
    it('should include provider name in result metadata', () => {
      const input: SplitterInput = {
        text: 'Test content',
        metadata: { chunkSize: 100, chunkOverlap: 20 },
      };

      const result = handler.processText(input);

      expect(result.metadata.provider).toBe('recursive');
    });

    it('should include chunk configuration in result metadata', () => {
      const input: SplitterInput = {
        text: 'Test content',
        metadata: { chunkSize: 150, chunkOverlap: 30 },
      };

      const result = handler.processText(input);

      expect(result.metadata.chunkSize).toBe(150);
      expect(result.metadata.chunkOverlap).toBe(30);
    });

    it('should use default chunk size when not provided', () => {
      const input: SplitterInput = {
        text: 'Test content',
      };

      const result = handler.processText(input);

      expect(result.metadata.chunkSize).toBe(1000); // Default chunk size
      expect(result.metadata.chunkOverlap).toBe(200); // Default overlap
    });

    it('should report correct total chunks count', () => {
      const lines = Array.from(
        { length: 50 },
        (_, i) => `Line ${i + 1}: Content`,
      );
      const text = lines.join('\n');

      const input: SplitterInput = {
        text,
        metadata: { chunkSize: 100, chunkOverlap: 20 },
      };

      const result = handler.processText(input);

      expect(result.metadata.totalChunks).toBe(result.chunks.length);
    });
  });
});
