import {
  TEST_USER_ID,
  createMockContextService,
} from 'src/common/context/testing/context.fixtures';
import type { ContextService } from 'src/common/context/services/context.service';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: unknown, _propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { MemoryRepository } from 'src/domain/memory/application/ports/memory.repository';
import {
  InvalidMemoryKeyError,
  MemoryContentTooLongError,
  MemoryEntryLimitReachedError,
} from 'src/domain/memory/application/memory.errors';
import { MemoryEntry } from 'src/domain/memory/domain/memory-entry.entity';
import {
  MEMORY_CONTENT_MAX_LENGTH,
  MEMORY_MAX_ENTRIES_PER_USER,
} from 'src/domain/memory/domain/memory.constants';
import { UpsertMemoryEntryCommand } from './upsert-memory-entry.command';
import { UpsertMemoryEntryUseCase } from './upsert-memory-entry.use-case';

describe('UpsertMemoryEntryUseCase', () => {
  function build(overrides: Partial<MemoryRepository> = {}) {
    const repository = {
      findAllByUserId: jest.fn().mockResolvedValue([]),
      findByUserIdAndKey: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockImplementation((entry: MemoryEntry) => entry),
      deleteByUserIdAndKey: jest.fn().mockResolvedValue(undefined),
      deleteAllByUserId: jest.fn().mockResolvedValue(undefined),
      countByUserId: jest.fn().mockResolvedValue(0),
      ...overrides,
    } as unknown as MemoryRepository;

    return {
      repository,
      useCase: new UpsertMemoryEntryUseCase(
        repository,
        createMockContextService(),
      ),
    };
  }

  it('stores the entry for the authenticated user', async () => {
    const { useCase, repository } = build();

    const entry = await useCase.execute(
      new UpsertMemoryEntryCommand('personal', 'Works in the Bauamt'),
    );

    expect(entry.userId).toBe(TEST_USER_ID);
    expect(entry.key).toBe('personal');
    expect(entry.content).toBe('Works in the Bauamt');
    expect(repository.upsert).toHaveBeenCalledTimes(1);
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
    expect(repository.upsert).not.toHaveBeenCalled();
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
    expect(repository.upsert).not.toHaveBeenCalled();
  });

  it('refuses a new key once the store is full', async () => {
    const { useCase, repository } = build({
      countByUserId: jest.fn().mockResolvedValue(MEMORY_MAX_ENTRIES_PER_USER),
    } as Partial<MemoryRepository>);

    await expect(
      useCase.execute(new UpsertMemoryEntryCommand('a_new_key', 'content')),
    ).rejects.toThrow(MemoryEntryLimitReachedError);
    expect(repository.upsert).not.toHaveBeenCalled();
  });

  it('still updates an existing key when the store is full', async () => {
    const existing = new MemoryEntry({
      userId: TEST_USER_ID,
      key: 'personal',
      content: 'old',
    });
    const { useCase, repository } = build({
      countByUserId: jest.fn().mockResolvedValue(MEMORY_MAX_ENTRIES_PER_USER),
      findByUserIdAndKey: jest.fn().mockResolvedValue(existing),
    } as Partial<MemoryRepository>);

    await useCase.execute(new UpsertMemoryEntryCommand('personal', 'new'));

    expect(repository.upsert).toHaveBeenCalledTimes(1);
  });

  it('refuses to write without an authenticated user', async () => {
    const repository = {
      upsert: jest.fn(),
      findByUserIdAndKey: jest.fn(),
      countByUserId: jest.fn(),
    } as unknown as MemoryRepository;
    const useCase = new UpsertMemoryEntryUseCase(repository, {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ContextService);

    await expect(
      useCase.execute(new UpsertMemoryEntryCommand('personal', 'content')),
    ).rejects.toThrow(UnauthorizedAccessError);
    expect(repository.upsert).not.toHaveBeenCalled();
  });
});
