import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import type { UUID } from 'crypto';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import {
  ThreadPiiMaskNotFoundError,
  UnexpectedThreadPiiMasksError,
} from 'src/domain/thread-pii-masks/application/thread-pii-masks.errors';
import { UnmaskThreadPiiMaskUseCase } from './unmask-thread-pii-mask.use-case';
import { UnmaskThreadPiiMaskCommand } from './unmask-thread-pii-mask.command';

describe('UnmaskThreadPiiMaskUseCase', () => {
  const threadId = '7b1f2a3c-4d5e-6f70-8192-a3b4c5d6e7f8' as UUID;
  let useCase: UnmaskThreadPiiMaskUseCase;
  let findByThreadId: jest.Mock;
  let saveMany: jest.Mock;

  const mask = () =>
    new ThreadPiiMask({
      threadId,
      category: PiiCategory.PERSON_NAME,
      maskIndex: 1,
      value: 'Dani',
    });

  beforeEach(() => {
    findByThreadId = jest.fn().mockResolvedValue([]);
    saveMany = jest.fn().mockResolvedValue(undefined);
    useCase = new UnmaskThreadPiiMaskUseCase(createPinoLoggerMock(), {
      findByThreadId,
      saveMany,
    });
  });

  it('marks the mask as unmasked and persists it', async () => {
    const target = mask();
    findByThreadId.mockResolvedValue([target]);

    const result = await useCase.execute(
      new UnmaskThreadPiiMaskCommand(threadId, target.id),
    );

    expect(target.unmasked).toBe(true);
    expect(saveMany).toHaveBeenCalledWith([target]);
    expect(result).toEqual([target]);
  });

  it('is idempotent for an already unmasked entry', async () => {
    const target = mask();
    target.unmasked = true;
    findByThreadId.mockResolvedValue([target]);

    const result = await useCase.execute(
      new UnmaskThreadPiiMaskCommand(threadId, target.id),
    );

    expect(saveMany).not.toHaveBeenCalled();
    expect(result).toEqual([target]);
  });

  it('throws a not-found error for an unknown mask id', async () => {
    findByThreadId.mockResolvedValue([mask()]);

    await expect(
      useCase.execute(
        new UnmaskThreadPiiMaskCommand(
          threadId,
          '00000000-0000-0000-0000-000000000000',
        ),
      ),
    ).rejects.toThrow(ThreadPiiMaskNotFoundError);
  });

  it('wraps repository failures in a module error', async () => {
    const target = mask();
    findByThreadId.mockResolvedValue([target]);
    saveMany.mockRejectedValue(new Error('connection lost'));

    await expect(
      useCase.execute(new UnmaskThreadPiiMaskCommand(threadId, target.id)),
    ).rejects.toThrow(UnexpectedThreadPiiMasksError);
  });
});
