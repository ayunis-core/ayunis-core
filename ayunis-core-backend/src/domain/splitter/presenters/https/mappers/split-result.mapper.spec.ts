import { Test, TestingModule } from '@nestjs/testing';
import { SplitResultMapper } from './split-result.mapper';
import { SplitResult, TextChunk } from '../../../domain/split-result.entity';
import { SplitterProvider } from '../../../domain/splitter-provider.enum';

describe('SplitResultMapper', () => {
  let mapper: SplitResultMapper;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SplitResultMapper],
    }).compile();

    mapper = module.get<SplitResultMapper>(SplitResultMapper);
  });

  it('should be defined', () => {
    expect(mapper).toBeDefined();
  });

  describe('mapToDto', () => {
    it('should map SplitResult to SplitResultDto', () => {
      // Arrange
      const chunks = [
        new TextChunk('Chunk 1', { index: 0 }),
        new TextChunk('Chunk 2', { index: 1 }),
      ];

      const splitResult = new SplitResult(chunks, {
        provider: SplitterProvider.RECURSIVE,
        chunkSize: 1000,
        chunkOverlap: 200,
        totalChunks: 2,
      });

      // Act
      const result = mapper.mapToDto(splitResult);

      // Assert
      expect(result).toBeDefined();
      expect(result.chunks).toHaveLength(2);
      expect(result.chunks[0].text).toBe('Chunk 1');
      expect(result.chunks[0].metadata).toEqual({ index: 0 });
      expect(result.chunks[1].text).toBe('Chunk 2');
      expect(result.metadata.provider).toBe(SplitterProvider.RECURSIVE);
      expect(result.metadata.chunkSize).toBe(1000);
      expect(result.metadata.chunkOverlap).toBe(200);
      expect(result.metadata.totalChunks).toBe(2);
    });

    it('should handle missing metadata fields', () => {
      // Arrange
      const chunks = [new TextChunk('Chunk 1')];
      const splitResult = new SplitResult(chunks, {
        provider: SplitterProvider.LINE,
      });

      // Act
      const result = mapper.mapToDto(splitResult);

      // Assert
      expect(result).toBeDefined();
      expect(result.metadata.provider).toBe(SplitterProvider.LINE);
      expect(result.metadata.totalChunks).toBe(1);
      expect(result.metadata.chunkSize).toBeUndefined();
      expect(result.metadata.chunkOverlap).toBeUndefined();
    });

    it('should calculate totalChunks if not provided', () => {
      // Arrange
      const chunks = [
        new TextChunk('Chunk 1'),
        new TextChunk('Chunk 2'),
        new TextChunk('Chunk 3'),
      ];

      const splitResult = new SplitResult(chunks, {
        provider: SplitterProvider.RECURSIVE,
      });

      // Act
      const result = mapper.mapToDto(splitResult);

      // Assert
      expect(result.metadata.totalChunks).toBe(3);
    });
  });
});
