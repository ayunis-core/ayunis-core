import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ReorderChaptersUseCase } from './reorder-chapters.use-case';
import { ReorderChaptersCommand } from './reorder-chapters.command';
import { AcademyChapterRepository } from '../../ports/academy-chapter.repository';
import { InvalidReorderError } from '../../academy.errors';

describe('ReorderChaptersUseCase', () => {
  let useCase: ReorderChaptersUseCase;
  let repository: jest.Mocked<AcademyChapterRepository>;

  beforeAll(async () => {
    const mockRepository = {
      findAllIds: jest.fn(),
      updatePositions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReorderChaptersUseCase,
        { provide: AcademyChapterRepository, useValue: mockRepository },
      ],
    }).compile();

    useCase = module.get<ReorderChaptersUseCase>(ReorderChaptersUseCase);
    repository = module.get(AcademyChapterRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should persist the submitted order when ids match the current chapters', async () => {
    const ids = [randomUUID(), randomUUID(), randomUUID()];
    repository.findAllIds.mockResolvedValue(ids);
    const reversed = [...ids].reverse();

    await useCase.execute(new ReorderChaptersCommand({ chapterIds: reversed }));

    expect(repository.updatePositions).toHaveBeenCalledWith(reversed);
  });

  it('should reject a reorder that omits an existing chapter', async () => {
    const ids = [randomUUID(), randomUUID(), randomUUID()];
    repository.findAllIds.mockResolvedValue(ids);

    await expect(
      useCase.execute(
        new ReorderChaptersCommand({ chapterIds: [ids[0], ids[1]] }),
      ),
    ).rejects.toThrow(InvalidReorderError);
    expect(repository.updatePositions).not.toHaveBeenCalled();
  });

  it('should reject a reorder that contains an unknown chapter id', async () => {
    const ids = [randomUUID(), randomUUID()];
    repository.findAllIds.mockResolvedValue(ids);

    await expect(
      useCase.execute(
        new ReorderChaptersCommand({
          chapterIds: [ids[0], ids[1], randomUUID()],
        }),
      ),
    ).rejects.toThrow(InvalidReorderError);
    expect(repository.updatePositions).not.toHaveBeenCalled();
  });
});
