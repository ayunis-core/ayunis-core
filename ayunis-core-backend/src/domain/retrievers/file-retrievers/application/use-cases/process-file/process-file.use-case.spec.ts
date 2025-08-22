import { Test, TestingModule } from '@nestjs/testing';
import { ProcessFileUseCase } from './process-file.use-case';
import { ProcessFileCommand } from './process-file.command';
import { FileRetrieverHandler } from '../../ports/file-retriever.handler';
import { FileRetrieverRegistry } from '../../file-retriever-handler.registry';
import { GetAllPermittedProvidersUseCase } from 'src/domain/models/application/use-cases/get-all-permitted-providers/get-all-permitted-providers.use-case';
import {
  FileRetrieverResult,
  FileRetrieverPage,
} from '../../../domain/file-retriever-result.entity';

describe('ProcessFileUseCase', () => {
  let useCase: ProcessFileUseCase;
  let mockHandler: Partial<FileRetrieverHandler>;
  let mockRegistry: Partial<FileRetrieverRegistry>;
  let mockGetProviders: Partial<GetAllPermittedProvidersUseCase>;

  beforeEach(async () => {
    mockHandler = { processFile: jest.fn() };
    mockRegistry = {
      getHandler: jest.fn().mockReturnValue(mockHandler),
    } as any;
    mockGetProviders = {
      execute: jest.fn().mockResolvedValue([{ provider: 'mistral' }]),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessFileUseCase,
        { provide: FileRetrieverRegistry, useValue: mockRegistry },
        {
          provide: GetAllPermittedProvidersUseCase,
          useValue: mockGetProviders,
        },
      ],
    }).compile();

    useCase = module.get<ProcessFileUseCase>(ProcessFileUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should process file successfully', async () => {
    const command = new ProcessFileCommand({
      orgId: '123e4567-e89b-12d3-a456-426614174000' as any,
      fileData: Buffer.from('test file content'),
      fileName: 'test.txt',
      fileType: 'text/plain',
    });
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
        fileType: command.fileType,
      }),
    );
  });
});
