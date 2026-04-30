import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { TransactionHost } from '@nestjs-cls/transactional';
import { AddDocumentToKnowledgeBaseUseCase } from './add-document-to-knowledge-base.use-case';
import { AddDocumentToKnowledgeBaseCommand } from './add-document-to-knowledge-base.command';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import { KnowledgeBase } from '../../../domain/knowledge-base.entity';
import { KnowledgeBaseNotFoundError } from '../../knowledge-bases.errors';
import { StartDocumentProcessingUseCase } from 'src/domain/sources/application/use-cases/start-document-processing/start-document-processing.use-case';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';

describe('AddDocumentToKnowledgeBaseUseCase', () => {
  let useCase: AddDocumentToKnowledgeBaseUseCase;
  let mockKbRepository: jest.Mocked<KnowledgeBaseRepository>;
  let mockStartDocumentProcessingUseCase: jest.Mocked<StartDocumentProcessingUseCase>;
  let mockTxHost: { withTransaction: jest.Mock };

  const userId = '11111111-1111-1111-1111-111111111111' as UUID;
  const orgId = '22222222-2222-2222-2222-222222222222' as UUID;
  const knowledgeBaseId = '33333333-3333-3333-3333-333333333333' as UUID;

  function buildProcessingSource(
    overrides: Partial<{ name: string }> = {},
  ): FileSource {
    return new FileSource({
      fileType: FileType.PDF,
      name: overrides.name ?? 'Protokoll.pdf',
      type: TextType.FILE,
      status: SourceStatus.PROCESSING,
      processingStartedAt: new Date(),
    });
  }

  beforeEach(async () => {
    mockKbRepository = {
      findById: jest.fn(),
      findAllByUserId: jest.fn(),
      findByIds: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      assignSourceToKnowledgeBase: jest.fn(),
      findSourcesByKnowledgeBaseId: jest.fn(),
      findSourceByIdAndKnowledgeBaseId: jest.fn(),
      countSourcesByKnowledgeBaseId: jest.fn(),
    } as jest.Mocked<KnowledgeBaseRepository>;

    mockStartDocumentProcessingUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<StartDocumentProcessingUseCase>;

    mockTxHost = {
      withTransaction: jest
        .fn()
        .mockImplementation(async (fn: () => Promise<unknown>) => fn()),
    };

    // Default: return a processing source
    mockStartDocumentProcessingUseCase.execute.mockImplementation(async (cmd) =>
      buildProcessingSource({ name: cmd.fileName }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddDocumentToKnowledgeBaseUseCase,
        { provide: KnowledgeBaseRepository, useValue: mockKbRepository },
        {
          provide: StartDocumentProcessingUseCase,
          useValue: mockStartDocumentProcessingUseCase,
        },
        { provide: TransactionHost, useValue: mockTxHost },
      ],
    }).compile();

    useCase = module.get(AddDocumentToKnowledgeBaseUseCase);
  });

  it('should validate KB, start document processing, and assign source to KB', async () => {
    const knowledgeBase = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Stadtratsprotokolle 2025',
      orgId,
      userId,
    });
    mockKbRepository.findById.mockResolvedValue(knowledgeBase);

    const command = new AddDocumentToKnowledgeBaseCommand({
      knowledgeBaseId,
      userId,
      fileData: Buffer.from('fake pdf content'),
      fileName: 'Protokoll_März_2025.pdf',
      fileType: 'application/pdf',
    });

    const result = await useCase.execute(command);

    // Source created with PROCESSING status
    expect(result.status).toBe(SourceStatus.PROCESSING);
    expect(result.name).toBe('Protokoll_März_2025.pdf');

    // StartDocumentProcessingUseCase called with correct params
    expect(mockStartDocumentProcessingUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        fileData: command.fileData,
        fileName: 'Protokoll_März_2025.pdf',
        fileType: 'application/pdf',
      }),
    );

    // Assigned to KB
    expect(mockKbRepository.assignSourceToKnowledgeBase).toHaveBeenCalledWith(
      result.id,
      knowledgeBaseId,
    );
  });

  it('should throw KnowledgeBaseNotFoundError when KB does not belong to user', async () => {
    const otherUserId = '99999999-9999-9999-9999-999999999999' as UUID;
    const knowledgeBase = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Anderer Benutzer KB',
      orgId,
      userId: otherUserId,
    });
    mockKbRepository.findById.mockResolvedValue(knowledgeBase);

    const command = new AddDocumentToKnowledgeBaseCommand({
      knowledgeBaseId,
      userId,
      fileData: Buffer.from('fake pdf content'),
      fileName: 'Protokoll.pdf',
      fileType: 'application/pdf',
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      KnowledgeBaseNotFoundError,
    );
    expect(mockStartDocumentProcessingUseCase.execute).not.toHaveBeenCalled();
  });

  it('should throw KnowledgeBaseNotFoundError when KB does not exist', async () => {
    mockKbRepository.findById.mockResolvedValue(null);

    const command = new AddDocumentToKnowledgeBaseCommand({
      knowledgeBaseId,
      userId,
      fileData: Buffer.from('fake pdf content'),
      fileName: 'Protokoll.pdf',
      fileType: 'application/pdf',
    });

    await expect(useCase.execute(command)).rejects.toThrow(
      KnowledgeBaseNotFoundError,
    );
  });

  it('should propagate StartDocumentProcessingUseCase failure', async () => {
    const knowledgeBase = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Stadtratsprotokolle 2025',
      orgId,
      userId,
    });
    mockKbRepository.findById.mockResolvedValue(knowledgeBase);
    mockStartDocumentProcessingUseCase.execute.mockRejectedValue(
      new Error('MinIO connection refused'),
    );

    const command = new AddDocumentToKnowledgeBaseCommand({
      knowledgeBaseId,
      userId,
      fileData: Buffer.from('fake pdf content'),
      fileName: 'Protokoll.pdf',
      fileType: 'application/pdf',
    });

    await expect(useCase.execute(command)).rejects.toThrow();

    // Source should NOT be assigned to KB
    expect(mockKbRepository.assignSourceToKnowledgeBase).not.toHaveBeenCalled();
  });

  it('should leave orphaned source when KB assignment fails after processing starts', async () => {
    const knowledgeBase = new KnowledgeBase({
      id: knowledgeBaseId,
      name: 'Stadtratsprotokolle 2025',
      orgId,
      userId,
    });
    mockKbRepository.findById.mockResolvedValue(knowledgeBase);
    mockKbRepository.assignSourceToKnowledgeBase.mockRejectedValue(
      new Error('DB constraint violation'),
    );

    const command = new AddDocumentToKnowledgeBaseCommand({
      knowledgeBaseId,
      userId,
      fileData: Buffer.from('fake pdf content'),
      fileName: 'Protokoll.pdf',
      fileType: 'application/pdf',
    });

    // Should throw — orphaned source will be cleaned by stale processing cron
    await expect(useCase.execute(command)).rejects.toThrow();

    // Processing was started (source created)
    expect(mockStartDocumentProcessingUseCase.execute).toHaveBeenCalledTimes(1);
  });
});
