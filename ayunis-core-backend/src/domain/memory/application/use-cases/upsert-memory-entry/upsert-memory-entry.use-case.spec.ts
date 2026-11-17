import {
  TEST_USER_ID,
  createMockContextService,
} from 'src/common/context/testing/context.fixtures';
import type { ContextService } from 'src/common/context/services/context.service';

import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { MemoryRepository } from 'src/domain/memory/application/ports/memory.repository';
import {
  InvalidMemoryKeyError,
  MemoryContentEmptyError,
  MemoryContentTooLongError,
  MemoryDescriptionTooLongError,
  MemoryEntryLimitReachedError,
} from 'src/domain/memory/application/memory.errors';
import type { MemoryEntry } from 'src/domain/memory/domain/memory-entry.entity';
import {
  MEMORY_CONTENT_MAX_LENGTH,
  MEMORY_DESCRIPTION_MAX_LENGTH,
  MEMORY_MAX_ENTRIES_PER_USER,
} from 'src/domain/memory/domain/memory.constants';
import { UpsertMemoryEntryCommand } from './upsert-memory-entry.command';
import { UpsertMemoryEntryUseCase } from './upsert-memory-entry.use-case';

describe('UpsertMemoryEntryUseCase', () => {
  function build(overrides: Partial<MemoryRepository> = {}) {
    const repository: MemoryRepository = {
      findAllByUserId: jest.fn().mockResolvedValue([]),
      findByUserIdAndKey: jest.fn().mockResolvedValue(null),
      upsertWithinLimit: jest
        .fn()
        .mockImplementation((entry: MemoryEntry) => Promise.resolve(entry)),
      deleteByUserIdAndKey: jest.fn().mockResolvedValue(undefined),
      deleteAllByUserId: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };

    return {
      repository,
      useCase: new UpsertMemoryEntryUseCase(
        repository,
        createMockContextService(),
      ),
    };
  }

  function written(repository: MemoryRepository) {
    const [[entry, options]] = jest.mocked(repository.upsertWithinLimit).mock
      .calls;
    return { entry, options };
  }

  it('stores the entry for the authenticated user within the entry limit', async () => {
    const { useCase, repository } = build();

    await useCase.execute(
      new UpsertMemoryEntryCommand('personal', 'Works in the Bauamt'),
    );

    const { entry, options } = written(repository);
    expect(entry).toMatchObject({
      userId: TEST_USER_ID,
      key: 'personal',
      content: 'Works in the Bauamt',
    });
    expect(options.limit).toBe(MEMORY_MAX_ENTRIES_PER_USER);
  });

  it('trims surrounding whitespace from the content', async () => {
    const { useCase } = build();

    const entry = await useCase.execute(
      new UpsertMemoryEntryCommand('personal', '  Works in the Bauamt \n'),
    );

    expect(entry.content).toBe('Works in the Bauamt');
  });

  it.each([
    ['Personal', 'an uppercase letter'],
    ['1personal', 'a leading digit'],
    ['my key', 'a space'],
    ['my-key', 'a hyphen'],
    ['a'.repeat(49), 'more characters than the limit'],
    ['', 'nothing at all'],
  ])('rejects the key %p, which contains %s', async (key) => {
    const { useCase, repository } = build();

    await expect(
      useCase.execute(new UpsertMemoryEntryCommand(key, 'content')),
    ).rejects.toThrow(InvalidMemoryKeyError);
    expect(repository.upsertWithinLimit).not.toHaveBeenCalled();
  });

  // get_memory would report a stored but empty entry as missing.
  it('rejects blank content instead of storing an empty entry', async () => {
    const { useCase, repository } = build();

    await expect(
      useCase.execute(new UpsertMemoryEntryCommand('personal', '  \n ')),
    ).rejects.toThrow(MemoryContentEmptyError);
    expect(repository.upsertWithinLimit).not.toHaveBeenCalled();
  });

  it('rejects content longer than the limit', async () => {
    const { useCase, repository } = build();

    await expect(
      useCase.execute(
        new UpsertMemoryEntryCommand(
          'personal',
          'x'.repeat(MEMORY_CONTENT_MAX_LENGTH + 1),
        ),
      ),
    ).rejects.toThrow(MemoryContentTooLongError);
    expect(repository.upsertWithinLimit).not.toHaveBeenCalled();
  });

  it('stores a trimmed description alongside the content', async () => {
    const { useCase, repository } = build();

    await useCase.execute(
      new UpsertMemoryEntryCommand(
        'report_template',
        'Intro, three findings, next steps',
        '  How the user wants monthly council reports structured ',
      ),
    );

    const { entry, options } = written(repository);
    expect(entry.description).toBe(
      'How the user wants monthly council reports structured',
    );
    expect(options.keepDescription).toBe(false);
  });

  it('keeps the stored description when the write omits one', async () => {
    const { useCase, repository } = build();

    await useCase.execute(
      new UpsertMemoryEntryCommand('report_template', 'new'),
    );

    expect(written(repository).options.keepDescription).toBe(true);
  });

  it('clears the description when the write sends an empty one', async () => {
    const { useCase, repository } = build();

    await useCase.execute(
      new UpsertMemoryEntryCommand('report_template', 'new', ' '),
    );

    const { entry, options } = written(repository);
    expect(entry.description).toBeNull();
    expect(options.keepDescription).toBe(false);
  });

  it('rejects a description longer than the limit', async () => {
    const { useCase, repository } = build();

    await expect(
      useCase.execute(
        new UpsertMemoryEntryCommand(
          'report_template',
          'content',
          'x'.repeat(MEMORY_DESCRIPTION_MAX_LENGTH + 1),
        ),
      ),
    ).rejects.toThrow(MemoryDescriptionTooLongError);
    expect(repository.upsertWithinLimit).not.toHaveBeenCalled();
  });

  it('refuses a new key once the memory is full', async () => {
    const { useCase } = build({
      upsertWithinLimit: jest.fn().mockResolvedValue(null),
    });

    await expect(
      useCase.execute(new UpsertMemoryEntryCommand('a_new_key', 'content')),
    ).rejects.toThrow(MemoryEntryLimitReachedError);
  });

  it('refuses to write without an authenticated user', async () => {
    const repository = {
      upsertWithinLimit: jest.fn(),
    } as unknown as MemoryRepository;
    const useCase = new UpsertMemoryEntryUseCase(repository, {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ContextService);

    await expect(
      useCase.execute(new UpsertMemoryEntryCommand('personal', 'content')),
    ).rejects.toThrow(UnauthorizedAccessError);
    expect(repository.upsertWithinLimit).not.toHaveBeenCalled();
  });
});
