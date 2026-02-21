import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { SplitTextUseCase } from './split-text.use-case';
import { SplitTextCommand } from './split-text.command';
import { SplitterHandlerRegistry } from '../../splitter-handler.registry';
import { SplitterType } from '../../../domain/splitter-type.enum';
import { SplitResult, TextChunk } from '../../../domain/split-result.entity';

describe('ProcessTextUseCase', () => {
  let useCase: SplitTextUseCase;
  let mockProviderRegistry: Partial<SplitterHandlerRegistry>;

  beforeAll(async () => {
    const mockHandler = {
      processText: jest.fn(),
      isAvailable: jest.fn().mockReturnValue(true),
    };

    mockProviderRegistry = {
      getHandler: jest.fn().mockReturnValue(mockHandler),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SplitTextUseCase,
        {
          provide: SplitterHandlerRegistry,
          useValue: mockProviderRegistry,
        },
      ],
    }).compile();

    useCase = module.get<SplitTextUseCase>(SplitTextUseCase);
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should process text successfully', () => {
      const command = new SplitTextCommand(
        'This is test text',
        SplitterType.RECURSIVE,
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
        SplitterType.RECURSIVE,
      );
      expect(mockHandler.processText).toHaveBeenCalledWith({
        text: 'This is test text',
        metadata: { chunkSize: 100 },
      });
      expect(result).toBe(expectedResult);
    });

    it('should handle different splitter providers', () => {
      const command = new SplitTextCommand('Test text', SplitterType.LINE);

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
        SplitterType.LINE,
      );
      expect(result).toBe(expectedResult);
    });

    it('should pass metadata to handler when provided', () => {
      const metadata = { chunkSize: 200, chunkOverlap: 20 };
      const command = new SplitTextCommand(
        'Test text',
        SplitterType.RECURSIVE,
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
      const command = new SplitTextCommand('Test text', SplitterType.RECURSIVE);

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
