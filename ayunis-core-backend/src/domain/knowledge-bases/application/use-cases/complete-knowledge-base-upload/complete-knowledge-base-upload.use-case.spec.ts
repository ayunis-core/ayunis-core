import { randomUUID } from 'crypto';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import type { CompleteSourceUploadCommand } from 'src/domain/sources/application/use-cases/complete-source-upload/complete-source-upload.command';
import { CompleteKnowledgeBaseUploadUseCase } from './complete-knowledge-base-upload.use-case';
import { CompleteKnowledgeBaseUploadCommand } from './complete-knowledge-base-upload.command';

describe('CompleteKnowledgeBaseUploadUseCase', () => {
  const targetId = randomUUID();
  const source = new FileSource({
    name: 'Haushalt.pdf',
    type: TextType.FILE,
    fileType: FileType.PDF,
  });
  const complete = { execute: jest.fn() };
  const target = { id: targetId };
  const repository = {
    findById: jest.fn().mockResolvedValue(target),
    countSourcesByKnowledgeBaseId: jest.fn().mockResolvedValue(0),
    assignSourceToKnowledgeBase: jest.fn().mockResolvedValue(undefined),
  };
  const access = { requireWrite: jest.fn().mockResolvedValue(undefined) };
  const useCase = new CompleteKnowledgeBaseUploadUseCase(
    repository as never,
    access as never,
    complete as never,
  );
  const command = new CompleteKnowledgeBaseUploadCommand(
    targetId,
    randomUUID(),
  );

  beforeEach(() => {
    jest.clearAllMocks();
    complete.execute.mockImplementation(
      async (input: CompleteSourceUploadCommand) => {
        await input.attach?.([source]);
        return { sources: [source], alreadyCompleted: false };
      },
    );
  });

  it('attaches through the shared completion transaction', async () => {
    const result = await useCase.execute(command);
    expect(repository.assignSourceToKnowledgeBase).toHaveBeenCalledWith(
      source.id,
      targetId,
    );
    expect(result.knowledgeBaseId).toBe(targetId);
  });

  it('propagates attachment failure to roll back shared completion', async () => {
    repository.assignSourceToKnowledgeBase.mockRejectedValueOnce(
      new Error('assignment failed'),
    );
    await expect(useCase.execute(command)).rejects.toThrow();
  });

  it('does not reattach an already completed upload', async () => {
    complete.execute.mockResolvedValueOnce({
      sources: [source],
      alreadyCompleted: true,
    });
    const result = await useCase.execute(command);
    expect(result).toBe(source);
    expect(repository.assignSourceToKnowledgeBase).not.toHaveBeenCalled();
  });

  it('checks target write access before invoking shared completion', async () => {
    access.requireWrite.mockRejectedValueOnce(new Error('write denied'));
    await expect(useCase.execute(command)).rejects.toThrow();
    expect(complete.execute).not.toHaveBeenCalled();
  });
});
