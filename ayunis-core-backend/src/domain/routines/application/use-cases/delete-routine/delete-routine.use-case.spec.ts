import { Test } from '@nestjs/testing';
import { ContextService } from 'src/common/context/services/context.service';
import { createMockContextService } from 'src/common/context/testing/context.fixtures';
import { RoutinesRepository } from 'src/domain/routines/application/ports/routines.repository';
import { RoutineNotFoundError } from 'src/domain/routines/application/routines.errors';
import {
  TEST_ROUTINE_ID,
  TEST_USER_ID,
  createMockRoutinesRepository,
} from 'src/domain/routines/application/testing/routine.fixtures';
import { DeleteRoutineCommand } from './delete-routine.command';
import { DeleteRoutineUseCase } from './delete-routine.use-case';

describe('DeleteRoutineUseCase', () => {
  let useCase: DeleteRoutineUseCase;
  let repository: jest.Mocked<RoutinesRepository>;

  beforeEach(async () => {
    repository = createMockRoutinesRepository();
    const module = await Test.createTestingModule({
      providers: [
        DeleteRoutineUseCase,
        { provide: RoutinesRepository, useValue: repository },
        { provide: ContextService, useValue: createMockContextService() },
      ],
    }).compile();
    useCase = module.get(DeleteRoutineUseCase);
  });

  it("deletes the current user's routine", async () => {
    repository.delete.mockResolvedValue(true);

    await useCase.execute(new DeleteRoutineCommand(TEST_ROUTINE_ID));

    expect(repository.delete).toHaveBeenCalledWith(
      TEST_USER_ID,
      TEST_ROUTINE_ID,
    );
  });

  it("reports another user's routine as not found", async () => {
    repository.delete.mockResolvedValue(false);

    await expect(
      useCase.execute(new DeleteRoutineCommand(TEST_ROUTINE_ID)),
    ).rejects.toThrow(RoutineNotFoundError);
  });
});
