import type { UUID } from 'crypto';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import { ThreadMaskAllocationLock } from 'src/domain/thread-pii-masks/application/services/thread-mask-allocation-lock.service';
import { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import { AllocateThreadPiiMasksUseCase } from './allocate-thread-pii-masks.use-case';
import { AllocateThreadPiiMasksCommand } from './allocate-thread-pii-masks.command';

describe('AllocateThreadPiiMasksUseCase', () => {
  const threadId = '7b1f2a3c-4d5e-6f70-8192-a3b4c5d6e7f8' as UUID;
  const known = new ThreadPiiMask({
    threadId,
    category: PiiCategory.PERSON_NAME,
    maskIndex: 3,
    value: 'Anna Schmidt',
  });
  let findByThreadId: jest.Mock;
  let saveMany: jest.Mock;
  let useCase: AllocateThreadPiiMasksUseCase;

  beforeEach(() => {
    findByThreadId = jest.fn().mockResolvedValue([known]);
    saveMany = jest.fn().mockResolvedValue(undefined);
    useCase = new AllocateThreadPiiMasksUseCase(
      { findByThreadId, saveMany },
      new ThreadMaskAllocationLock(),
    );
  });

  it('keeps the token the thread already has for a value and persists nothing new', async () => {
    const result = await useCase.execute(
      new AllocateThreadPiiMasksCommand(threadId, [
        { category: PiiCategory.PERSON_NAME, value: 'Anna Schmidt' },
      ]),
    );

    expect(result.created).toEqual([]);
    expect(result.masks.map((mask) => mask.token)).toEqual([
      '{{pii:PERSON_NAME_3}}',
    ]);
    expect(saveMany).not.toHaveBeenCalled();
  });

  it('persists a new token after the highest index of the category for a value the thread does not know', async () => {
    const result = await useCase.execute(
      new AllocateThreadPiiMasksCommand(threadId, [
        { category: PiiCategory.PERSON_NAME, value: 'Bernd Bauer' },
      ]),
    );

    const saved = saveMany.mock.calls[0][0] as ThreadPiiMask[];
    expect(
      saved.map((mask) => [mask.token, mask.value, mask.threadId]),
    ).toEqual([['{{pii:PERSON_NAME_4}}', 'Bernd Bauer', threadId]]);
    expect(result.masks.map((mask) => mask.token)).toEqual([
      '{{pii:PERSON_NAME_3}}',
      '{{pii:PERSON_NAME_4}}',
    ]);
  });

  it('numbers concurrent calls on one thread after each other', async () => {
    const stored: ThreadPiiMask[] = [known];
    findByThreadId.mockImplementation(() => Promise.resolve([...stored]));
    saveMany.mockImplementation((masks: ThreadPiiMask[]) => {
      stored.push(...masks);
      return Promise.resolve();
    });

    await Promise.all(
      ['Bernd Bauer', 'Carla Weber'].map((value) =>
        useCase.execute(
          new AllocateThreadPiiMasksCommand(threadId, [
            { category: PiiCategory.PERSON_NAME, value },
          ]),
        ),
      ),
    );

    expect(stored.map((mask) => mask.maskIndex)).toEqual([3, 4, 5]);
  });
});
