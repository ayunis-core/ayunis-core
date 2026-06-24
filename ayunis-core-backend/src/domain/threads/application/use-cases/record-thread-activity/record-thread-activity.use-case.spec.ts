import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { RecordThreadActivityUseCase } from './record-thread-activity.use-case';
import { RecordThreadActivityCommand } from './record-thread-activity.command';
import { ThreadsRepository } from '../../ports/threads.repository';

describe('RecordThreadActivityUseCase', () => {
  let useCase: RecordThreadActivityUseCase;
  let mockThreadsRepository: { updateLastActivityAt: jest.Mock };

  beforeEach(async () => {
    mockThreadsRepository = {
      updateLastActivityAt: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordThreadActivityUseCase,
        { provide: ThreadsRepository, useValue: mockThreadsRepository },
      ],
    }).compile();

    useCase = module.get(RecordThreadActivityUseCase);
  });

  it('bumps lastActivityAt for the thread to the activity time', async () => {
    const threadId = randomUUID();
    const occurredAt = new Date('2026-06-16T10:30:00.000Z');

    await useCase.execute(
      new RecordThreadActivityCommand(threadId, occurredAt),
    );

    expect(mockThreadsRepository.updateLastActivityAt).toHaveBeenCalledWith({
      threadId,
      lastActivityAt: occurredAt,
    });
  });

  it('swallows repository errors so the message-add path is never broken', async () => {
    mockThreadsRepository.updateLastActivityAt.mockRejectedValueOnce(
      new Error('db unavailable'),
    );

    await expect(
      useCase.execute(
        new RecordThreadActivityCommand(randomUUID(), new Date()),
      ),
    ).resolves.toBeUndefined();
  });
});
