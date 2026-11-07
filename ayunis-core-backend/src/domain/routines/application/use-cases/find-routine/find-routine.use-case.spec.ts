import { Test } from '@nestjs/testing';
import { ContextService } from 'src/common/context/services/context.service';
import { createMockContextService } from 'src/common/context/testing/context.fixtures';
import { RoutinesRepository } from 'src/domain/routines/application/ports/routines.repository';
import { RoutineNotFoundError } from 'src/domain/routines/application/routines.errors';
import {
  TEST_ROUTINE_ID,
  TEST_USER_ID,
  aRoutine,
  createMockRoutinesRepository,
} from 'src/domain/routines/application/testing/routine.fixtures';
import { FindRoutineQuery } from './find-routine.query';
import { FindRoutineUseCase } from './find-routine.use-case';

describe('FindRoutineUseCase', () => {
  let useCase: FindRoutineUseCase;
  let repository: jest.Mocked<RoutinesRepository>;

  beforeEach(async () => {
    repository = createMockRoutinesRepository();
    const module = await Test.createTestingModule({
      providers: [
        FindRoutineUseCase,
        { provide: RoutinesRepository, useValue: repository },
        { provide: ContextService, useValue: createMockContextService() },
      ],
    }).compile();
    useCase = module.get(FindRoutineUseCase);
  });

  it("looks the routine up within the current user's routines", async () => {
    repository.findById.mockResolvedValue(aRoutine());

    await expect(
      useCase.execute(new FindRoutineQuery(TEST_ROUTINE_ID)),
    ).resolves.toEqual(aRoutine());
    expect(repository.findById).toHaveBeenCalledWith(
      TEST_USER_ID,
      TEST_ROUTINE_ID,
    );
  });

  it("reports another user's routine as not found", async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(new FindRoutineQuery(TEST_ROUTINE_ID)),
    ).rejects.toThrow(RoutineNotFoundError);
  });
});
