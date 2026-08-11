import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { ThreadNotFoundError } from 'src/domain/threads/application/threads.errors';
import { ToggleThreadPinnedCommand } from './toggle-thread-pinned.command';
import { ToggleThreadPinnedUseCase } from './toggle-thread-pinned.use-case';

const USER_ID = '11111111-1111-4111-8111-111111111111' as UUID;
const THREAD_ID = '22222222-2222-4222-8222-222222222222' as UUID;

describe('ToggleThreadPinnedUseCase', () => {
  let useCase: ToggleThreadPinnedUseCase;
  let threadsRepository: jest.Mocked<ThreadsRepository>;

  async function setup(context: { userId?: UUID } = { userId: USER_ID }) {
    threadsRepository = {
      togglePinned: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<ThreadsRepository>;

    const module = await Test.createTestingModule({
      providers: [
        ToggleThreadPinnedUseCase,
        { provide: ThreadsRepository, useValue: threadsRepository },
        {
          provide: ContextService,
          useValue: { get: jest.fn(() => context.userId) },
        },
      ],
    }).compile();
    useCase = module.get(ToggleThreadPinnedUseCase);
  }

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  beforeEach(async () => {
    await setup();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the new pin state', async () => {
    threadsRepository.togglePinned.mockResolvedValue(false);

    await expect(
      useCase.execute(new ToggleThreadPinnedCommand({ threadId: THREAD_ID })),
    ).resolves.toBe(false);
    expect(threadsRepository.togglePinned).toHaveBeenCalledWith(
      THREAD_ID,
      USER_ID,
    );
  });

  it('propagates a thread the caller does not own', async () => {
    threadsRepository.togglePinned.mockRejectedValue(
      new ThreadNotFoundError(THREAD_ID, USER_ID),
    );

    await expect(
      useCase.execute(new ToggleThreadPinnedCommand({ threadId: THREAD_ID })),
    ).rejects.toThrow(ThreadNotFoundError);
  });

  it('rejects an unauthenticated caller', async () => {
    await setup({});

    await expect(
      useCase.execute(new ToggleThreadPinnedCommand({ threadId: THREAD_ID })),
    ).rejects.toThrow(UnauthorizedAccessError);
  });
});
