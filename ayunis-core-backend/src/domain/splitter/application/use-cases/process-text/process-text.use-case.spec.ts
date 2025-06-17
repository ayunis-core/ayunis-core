import { Test, TestingModule } from '@nestjs/testing';
import { ProcessTextUseCase } from './process-text.use-case';
import { ProcessTextCommand } from './process-text.command';
import { SplitterProviderRegistry } from '../../splitter-provider.registry';
import { SplitterProvider } from '../../../domain/splitter-provider.enum';
import { SplitResult, TextChunk } from '../../../domain/split-result.entity';

describe('ProcessTextUseCase', () => {
  let useCase: ProcessTextUseCase;
  let mockProviderRegistry: Partial<SplitterProviderRegistry>;

  beforeEach(async () => {
    const mockHandler = {
      processText: jest.fn(),
      isAvailable: jest.fn().mockReturnValue(true),
    };

    mockProviderRegistry = {
      getHandler: jest.fn().mockReturnValue(mockHandler),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessTextUseCase,
        {
          provide: SplitterProviderRegistry,
          useValue: mockProviderRegistry,
        },
      ],
    }).compile();

    useCase = module.get<ProcessTextUseCase>(ProcessTextUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should process text successfully', () => {
      const command = new ProcessTextCommand(
        'This is test text',
        SplitterProvider.RECURSIVE,
        { chunkSize: 100 },
      );

      const expectedResult = new SplitResult([
        new TextChunk('This is test text'),
      ]);

      const mockHandler = {
        processText: jest.fn().mockReturnValue(expectedResult),
        isAvailable: jest.fn().mockReturnValue(true),
      };

      jest
        .spyOn(mockProviderRegistry, 'getHandler')
        .mockReturnValue(mockHandler);

      const result = useCase.execute(command);

      expect(mockProviderRegistry.getHandler).toHaveBeenCalledWith(
        SplitterProvider.RECURSIVE,
      );
      expect(mockHandler.processText).toHaveBeenCalledWith({
        text: 'This is test text',
        metadata: { chunkSize: 100 },
      });
      expect(result).toBe(expectedResult);
    });

    it('should handle different splitter providers', () => {
      const command = new ProcessTextCommand(
        'Test text',
        SplitterProvider.LINE,
      );

      const expectedResult = new SplitResult([new TextChunk('Test text')]);

      const mockHandler = {
        processText: jest.fn().mockReturnValue(expectedResult),
        isAvailable: jest.fn().mockReturnValue(true),
      };

      jest
        .spyOn(mockProviderRegistry, 'getHandler')
        .mockReturnValue(mockHandler);

      const result = useCase.execute(command);

      expect(mockProviderRegistry.getHandler).toHaveBeenCalledWith(
        SplitterProvider.LINE,
      );
      expect(result).toBe(expectedResult);
    });

    it('should pass metadata to handler when provided', () => {
      const metadata = { chunkSize: 200, chunkOverlap: 20 };
      const command = new ProcessTextCommand(
        'Test text',
        SplitterProvider.RECURSIVE,
        metadata,
      );

      const mockHandler = {
        processText: jest.fn().mockReturnValue(new SplitResult([])),
        isAvailable: jest.fn().mockReturnValue(true),
      };

      jest
        .spyOn(mockProviderRegistry, 'getHandler')
        .mockReturnValue(mockHandler);

      useCase.execute(command);

      expect(mockHandler.processText).toHaveBeenCalledWith({
        text: 'Test text',
        metadata,
      });
    });

    it('should handle missing metadata', () => {
      const command = new ProcessTextCommand(
        'Test text',
        SplitterProvider.RECURSIVE,
      );

      const mockHandler = {
        processText: jest.fn().mockReturnValue(new SplitResult([])),
        isAvailable: jest.fn().mockReturnValue(true),
      };

      jest
        .spyOn(mockProviderRegistry, 'getHandler')
        .mockReturnValue(mockHandler);

      useCase.execute(command);

      expect(mockHandler.processText).toHaveBeenCalledWith({
        text: 'Test text',
        metadata: undefined,
      });
    });
  });
});
