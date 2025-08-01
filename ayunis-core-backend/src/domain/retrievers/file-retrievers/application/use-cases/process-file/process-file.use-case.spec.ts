import { Test, TestingModule } from '@nestjs/testing';
import { ProcessFileUseCase } from './process-file.use-case';
import { ProcessFileCommand } from './process-file.command';
import { FileRetrieverHandler } from '../../ports/file-retriever.handler';
import {
  FileRetrieverResult,
  FileRetrieverPage,
} from '../../../domain/file-retriever-result.entity';

describe('ProcessFileUseCase', () => {
  let useCase: ProcessFileUseCase;
  let mockHandler: Partial<FileRetrieverHandler>;

  beforeEach(async () => {
    mockHandler = {
      processFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessFileUseCase,
        { provide: FileRetrieverHandler, useValue: mockHandler },
      ],
    }).compile();

    useCase = module.get<ProcessFileUseCase>(ProcessFileUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should process file successfully', async () => {
    const command = new ProcessFileCommand(
      Buffer.from('test file content'),
      'test.txt',
    );
    const expectedResult = new FileRetrieverResult([
      new FileRetrieverPage('processed content', 1),
    ]);

    jest.spyOn(mockHandler, 'processFile').mockResolvedValue(expectedResult);

    const result = await useCase.execute(command);

    expect(result).toBe(expectedResult);
    expect(mockHandler.processFile).toHaveBeenCalledWith(
      expect.objectContaining({
        fileData: command.fileData,
        filename: command.fileName,
      }),
    );
  });
});
