import { randomUUID } from 'crypto';
import type { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { Logger } from '@nestjs/common';
import type { ContextService } from 'src/common/context/services/context.service';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import type { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseWriteAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-write-access.service';
import {
  KnowledgeBaseNotFoundError,
  KnowledgeBaseSourceLimitExceededError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBasesConstants } from 'src/domain/knowledge-bases/domain/knowledge-bases.constants';
import { WorkspaceNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import type { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import type { StartDocumentProcessingUseCase } from 'src/domain/sources/application/use-cases/start-document-processing/start-document-processing.use-case';
import type { DeleteSourceUseCase } from 'src/domain/sources/application/use-cases/delete-source/delete-source.use-case';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import { AddDocumentToKnowledgeBaseUseCase } from './add-document-to-knowledge-base.use-case';
import { AddDocumentToKnowledgeBaseCommand } from './add-document-to-knowledge-base.command';

function setup(scope: 'personal' | 'workspace' = 'personal') {
  const userId = randomUUID(),
    orgId = randomUUID();
  const principal = { userId, orgId };
  const context = {
    get: (key: keyof typeof principal) => principal[key],
  } as unknown as ContextService;
  const knowledgeBase =
    scope === 'personal'
      ? new PersonalKnowledgeBase({ name: 'Permit regulations', userId, orgId })
      : new WorkspaceKnowledgeBase({
          name: 'Permit regulations',
          workspaceId: randomUUID(),
          orgId,
        });
  const repository = {
    findById: jest.fn().mockResolvedValue(knowledgeBase),
    countSourcesByKnowledgeBaseId: jest.fn().mockResolvedValue(0),
    assignSourceToKnowledgeBase: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<KnowledgeBaseRepository>;
  const workspaceAccess = {
    execute: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<AssertWorkspaceWriteAccessUseCase>;
  const source = new FileSource({
    fileType: FileType.PDF,
    name: 'regulations.pdf',
    type: TextType.FILE,
    status: SourceStatus.PROCESSING,
    processingStartedAt: new Date(),
  });
  const processing = {
    execute: jest.fn().mockResolvedValue(source),
  } as unknown as jest.Mocked<StartDocumentProcessingUseCase>;
  const deleteSource = {
    execute: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<DeleteSourceUseCase>;
  const command = new AddDocumentToKnowledgeBaseCommand({
    knowledgeBaseId: knowledgeBase.id,
    file: {
      data: Buffer.from('PDF contents'),
      name: source.name,
      type: 'application/pdf',
    },
  });
  let transactionActive = false;
  const txHost = {
    withTransaction: jest.fn(async (callback: () => Promise<unknown>) => {
      transactionActive = true;
      try {
        return await callback();
      } finally {
        transactionActive = false;
      }
    }),
  };
  const useCase = new AddDocumentToKnowledgeBaseUseCase(
    repository,
    new KnowledgeBaseWriteAccessService(context, workspaceAccess),
    processing,
    deleteSource,
    txHost as unknown as TransactionHost<TransactionalAdapterTypeOrm>,
  );
  return {
    useCase,
    command,
    repository,
    workspaceAccess,
    processing,
    deleteSource,
    source,
    knowledgeBase,
    principal,
    txHost,
    isTransactionActive: () => transactionActive,
  };
}

describe(AddDocumentToKnowledgeBaseUseCase.name, () => {
  describe.each(['personal', 'workspace'] as const)('%s ownership', (scope) => {
    it('authorizes, processes and assigns the supplied file', async () => {
      const {
        useCase,
        command,
        repository,
        processing,
        source,
        deleteSource,
        txHost,
        isTransactionActive,
      } = setup(scope);
      repository.countSourcesByKnowledgeBaseId.mockImplementation(() => {
        expect(isTransactionActive()).toBe(true);
        return Promise.resolve(0);
      });
      processing.execute.mockImplementation(() => {
        expect(isTransactionActive()).toBe(false);
        return Promise.resolve(source);
      });
      await expect(useCase.execute(command)).resolves.toBe(source);
      expect(txHost.withTransaction).toHaveBeenCalledTimes(1);
      expect(processing.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          fileData: command.file.data,
          fileName: command.file.name,
          fileType: command.file.type,
        }),
      );
      expect(repository.assignSourceToKnowledgeBase).toHaveBeenCalledWith(
        source.id,
        command.knowledgeBaseId,
      );
      expect(deleteSource.execute).not.toHaveBeenCalled();
    });
    it('checks capacity before processing', async () => {
      const { useCase, command, repository, processing } = setup(scope);
      repository.countSourcesByKnowledgeBaseId.mockResolvedValue(
        KnowledgeBasesConstants.MAX_SOURCES,
      );
      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        KnowledgeBaseSourceLimitExceededError,
      );
      expect(processing.execute).not.toHaveBeenCalled();
    });
    it('cleans up a new source when assignment fails', async () => {
      const {
        useCase,
        command,
        repository,
        deleteSource,
        source,
        knowledgeBase,
      } = setup(scope);
      repository.assignSourceToKnowledgeBase.mockRejectedValue(
        new Error('Assignment failed'),
      );
      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        UnexpectedKnowledgeBaseError,
      );
      expect(deleteSource.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceId: source.id,
          orgId: knowledgeBase.orgId,
        }),
      );
    });
    it('rejects another organization before processing', async () => {
      const { useCase, command, principal, processing } = setup(scope);
      principal.orgId = randomUUID();
      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        KnowledgeBaseNotFoundError,
      );
      expect(processing.execute).not.toHaveBeenCalled();
    });
  });
  it('rejects another personal owner before capacity lookup or processing', async () => {
    const { useCase, command, principal, repository, processing } = setup();
    principal.userId = randomUUID();
    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      KnowledgeBaseNotFoundError,
    );
    expect(repository.countSourcesByKnowledgeBaseId).not.toHaveBeenCalled();
    expect(processing.execute).not.toHaveBeenCalled();
  });
  it('returns knowledge-base not found without processing when workspace write authorization is rejected', async () => {
    const { useCase, command, workspaceAccess, repository, processing } =
      setup('workspace');
    workspaceAccess.execute.mockRejectedValue(
      new WorkspaceNotFoundError(randomUUID()),
    );
    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      KnowledgeBaseNotFoundError,
    );
    expect(repository.countSourcesByKnowledgeBaseId).not.toHaveBeenCalled();
    expect(processing.execute).not.toHaveBeenCalled();
  });
  it('rejects a missing knowledge base', async () => {
    const { useCase, command, repository, processing } = setup();
    repository.findById.mockResolvedValue(null);
    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      KnowledgeBaseNotFoundError,
    );
    expect(processing.execute).not.toHaveBeenCalled();
  });
  it('does not assign or delete when processing fails', async () => {
    const { useCase, command, repository, processing, deleteSource } = setup();
    processing.execute.mockRejectedValue(
      new Error('Object storage unavailable'),
    );
    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      UnexpectedKnowledgeBaseError,
    );
    expect(repository.assignSourceToKnowledgeBase).not.toHaveBeenCalled();
    expect(deleteSource.execute).not.toHaveBeenCalled();
  });
  it('logs cleanup failure without hiding the assignment error', async () => {
    const { useCase, command, repository, deleteSource, source } = setup();
    const assignmentError = new KnowledgeBaseNotFoundError(
      command.knowledgeBaseId,
    );
    const cleanupError = new Error('Cleanup failed');
    repository.assignSourceToKnowledgeBase.mockRejectedValue(assignmentError);
    deleteSource.execute.mockRejectedValue(cleanupError);
    const log = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    try {
      await expect(useCase.execute(command)).rejects.toBe(assignmentError);
      expect(log).toHaveBeenCalledWith(
        { sourceId: source.id, cleanupError },
        'Failed to clean up unassigned source',
      );
    } finally {
      log.mockRestore();
    }
  });
});
