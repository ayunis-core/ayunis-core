import { Test, TestingModule } from '@nestjs/testing';
import { RetrieveFileContentUseCase } from './retrieve-file-content.use-case';
import { RetrieveFileContentCommand } from './retrieve-file-content.command';
import { FileRetrieverHandler } from '../../ports/file-retriever.handler';
import { FileRetrieverRegistry } from '../../file-retriever-handler.registry';
import { GetAllPermittedProvidersUseCase } from 'src/domain/models/application/use-cases/get-all-permitted-providers/get-all-permitted-providers.use-case';
import {
  FileRetrieverResult,
  FileRetrieverPage,
} from '../../../domain/file-retriever-result.entity';
import { ContextService } from 'src/common/context/services/context.service';

describe('ProcessFileUseCase', () => {
  let useCase: RetrieveFileContentUseCase;
  let mockHandler: Partial<FileRetrieverHandler>;
  let mockRegistry: Partial<FileRetrieverRegistry>;
  let mockGetProviders: Partial<GetAllPermittedProvidersUseCase>;
  let mockContextService: Partial<ContextService>;

  beforeEach(async () => {
    mockHandler = { processFile: jest.fn() };
    mockRegistry = {
      getHandler: jest.fn().mockReturnValue(mockHandler),
    };
    mockGetProviders = {
      execute: jest.fn().mockResolvedValue([{ provider: 'mistral' }]),
    };
    mockContextService = {
      get: jest.fn().mockReturnValue('123e4567-e89b-12d3-a456-426614174000'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetrieveFileContentUseCase,
        { provide: FileRetrieverRegistry, useValue: mockRegistry },
        {
          provide: GetAllPermittedProvidersUseCase,
          useValue: mockGetProviders,
        },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get<RetrieveFileContentUseCase>(
      RetrieveFileContentUseCase,
    );
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should process file successfully', async () => {
    const command = new RetrieveFileContentCommand({
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
