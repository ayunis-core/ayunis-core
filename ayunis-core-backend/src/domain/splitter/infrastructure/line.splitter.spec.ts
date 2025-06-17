import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LineSplitterHandler } from './line.splitter';
import { SplitResult, TextChunk } from '../domain/split-result.entity';
import { SplitterProcessingError } from '../application/splitter.errors';

describe('LineSplitterHandler', () => {
  let handler: LineSplitterHandler;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(async () => {
    // Mock ConfigService
    mockConfigService = {
      get: jest.fn().mockImplementation((key) => {
        if (key === 'splitter.line.defaultChunkSize') return 100;
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LineSplitterHandler,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    handler = module.get<LineSplitterHandler>(LineSplitterHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should always be available', () => {
    expect(handler.isAvailable()).toBe(true);
  });

  describe('processText', () => {
    it('should split text into chunks by lines with default settings', async () => {
      // Arrange
      const text = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';

      // Act
      const result = await handler.processText({ text });

      // Assert
      expect(result).toBeInstanceOf(SplitResult);
      expect(result.chunks).toBeInstanceOf(Array);
      expect(result.chunks.length).toBe(1); // Small text, one chunk
      expect(result.metadata).toBeDefined();
      expect(result.metadata.provider).toBe('line');
      expect(result.metadata.chunkSize).toBe(100);
    });

    it('should use custom chunk size', async () => {
      // Arrange
      const text = Array(20)
        .fill('Line')
        .map((line, i) => `${line} ${i + 1}`)
        .join('\n');
      const chunkSize = 5;

      // Act
      const result = await handler.processText({
        text,
        metadata: {
          chunkSize,
        },
      });

      // Assert
      expect(result.chunks.length).toBe(4); // 20 lines with 5 lines per chunk, with header in each = 4 chunks
      expect(result.metadata.chunkSize).toBe(chunkSize);
    });

    it('should preserve header in each chunk', async () => {
      // Arrange
      const header = 'Column1,Column2,Column3';
      const dataLines = Array(10)
        .fill('')
        .map((_, i) => `data${i},value${i},test${i}`);
      const text = [header, ...dataLines].join('\n');
      const chunkSize = 3;

      // Act
      const result = await handler.processText({
        text,
        metadata: {
          chunkSize,
          preserveHeader: true,
        },
      });

      // Assert
      expect(result.chunks.length).toBeGreaterThan(1);

      // Each chunk should start with the header
      result.chunks.forEach((chunk) => {
        const lines = chunk.text.split('\n');
        expect(lines[0]).toBe(header);
      });
    });

    it('should skip blank lines if specified', async () => {
      // Arrange
      const text = 'Line 1\n\nLine 3\n\n\nLine 6';

      // Act
      const result = await handler.processText({
        text,
        metadata: {
          skipBlankLines: true,
        },
      });

      // Assert
      const linesInChunk = result.chunks[0].text.split('\n');
      expect(linesInChunk.length).toBe(3); // 3 non-empty lines
      expect(linesInChunk[0]).toBe('Line 1');
      expect(linesInChunk[1]).toBe('Line 3');
      expect(linesInChunk[2]).toBe('Line 6');
    });

    it('should handle CSV with quoted fields that span multiple lines', async () => {
      // Arrange
      const csvText =
        'Header1,Header2,Header3\n' +
        'Value1,"Value2\nwith a newline",Value3\n' +
        'Value4,Value5,Value6';

      // Act
      const result = await handler.processText({
        text: csvText,
        metadata: {
          detectQuotes: true,
          preserveHeader: true,
        },
      });

      // Assert
      expect(result.chunks.length).toBe(1);
      const processedText = result.chunks[0].text;
      expect(processedText).toContain('Header1,Header2,Header3');
      expect(processedText).toContain('Value1,"Value2\nwith a newline",Value3');
    });

    it('should use provided header row', async () => {
      // Arrange
      const customHeader = 'CustomCol1,CustomCol2,CustomCol3';
      const dataLines = ['data1,data2,data3', 'value1,value2,value3'];
      const text = dataLines.join('\n');

      // Act
      const result = await handler.processText({
        text,
        metadata: {
          headerRow: customHeader,
          preserveHeader: true,
        },
      });

      // Assert
      const lines = result.chunks[0].text.split('\n');
      expect(lines[0]).toBe(customHeader);
    });

    it('should throw SplitterProcessingError if processing fails', () => {
      // Arrange
      // Mock implementation to force an error
      jest.spyOn(handler as any, 'splitTextByLines').mockImplementation(() => {
        throw new Error('Test error');
      });

      // Act & Assert
      expect(() => handler.processText({ text: 'test' })).toThrow(
        SplitterProcessingError,
      );
    });
  });

  describe('handleQuotedCSV', () => {
    it('should correctly join lines with quotes spanning multiple lines', () => {
      // Arrange
      const lines = [
        'field1,"field2 start',
        'field2 continued",field3',
        'next,row,data',
      ];

      // Act
      // @ts-ignore - accessing private method for testing
      const result = handler['handleQuotedCSV'](lines);

      // Assert
      expect(result.length).toBe(2);
      expect(result[0]).toBe('field1,"field2 start\nfield2 continued",field3');
      expect(result[1]).toBe('next,row,data');
    });

    it('should handle multiple quoted sections', () => {
      // Arrange
      const lines = [
        'field1,"field2 with',
        'a line break",field3,"field4',
        'also with a break"',
      ];

      // Act
      // @ts-ignore - accessing private method for testing
      const result = handler['handleQuotedCSV'](lines);

      // Assert
      expect(result.length).toBe(1);
      expect(result[0]).toBe(
        'field1,"field2 with\na line break",field3,"field4\nalso with a break"',
      );
    });
  });
});
