import { RecursiveSplitterHandler } from './recursive.splitter';
import type { SplitterInput } from '../../application/ports/splitter.handler';

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
