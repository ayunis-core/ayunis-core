import { randomUUID } from 'crypto';
import { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import type { CompleteSourceUploadCommand } from 'src/domain/sources/application/use-cases/complete-source-upload/complete-source-upload.command';
import { CompleteSkillSourceUploadUseCase } from './complete-skill-source-upload.use-case';
import { CompleteSkillSourceUploadCommand } from './complete-skill-source-upload.command';

describe('CompleteSkillSourceUploadUseCase', () => {
  const targetId = randomUUID();
  const source = new FileSource({
    name: 'Haushalt.pdf',
    type: TextType.FILE,
    fileType: FileType.PDF,
  });
  const complete = { execute: jest.fn() };
  const target = { id: targetId, sourceIds: [] as string[] };
  const repository = { findById: jest.fn().mockResolvedValue(target) };
  const access = { requireWrite: jest.fn().mockResolvedValue(undefined) };
  const updated = { ...target, sourceIds: [source.id] };
  const assign = { execute: jest.fn().mockResolvedValue(updated) };
  const useCase = new CompleteSkillSourceUploadUseCase(
    repository as never,
    access as never,
    complete as never,
    assign as never,
  );
  const command = new CompleteSkillSourceUploadCommand(targetId, randomUUID());

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
    expect(assign.execute).toHaveBeenCalledWith(
      expect.objectContaining({ skillId: targetId, sourceId: source.id }),
    );
    expect(result).toBe(updated);
  });

  it('propagates attachment failure to roll back shared completion', async () => {
    assign.execute.mockRejectedValueOnce(new Error('assignment failed'));
    await expect(useCase.execute(command)).rejects.toThrow();
  });

  it('does not reattach an already completed upload', async () => {
    complete.execute.mockResolvedValueOnce({
      sources: [source],
      alreadyCompleted: true,
    });
    const result = await useCase.execute(command);
    expect(result).toBe(target);
    expect(assign.execute).not.toHaveBeenCalled();
  });

  it('checks target write access before invoking shared completion', async () => {
    access.requireWrite.mockRejectedValueOnce(new Error('write denied'));
    await expect(useCase.execute(command)).rejects.toThrow();
    expect(complete.execute).not.toHaveBeenCalled();
  });
});
