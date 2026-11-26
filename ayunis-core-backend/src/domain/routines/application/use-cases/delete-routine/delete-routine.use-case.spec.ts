import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContextService } from 'src/common/context/services/context.service';
import { createMockContextService } from 'src/common/context/testing/context.fixtures';
import { RoutineDeletedEvent } from 'src/domain/routines/application/events/routine-deleted.event';
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
  let eventEmitter: { emitAsync: jest.Mock };

  beforeEach(async () => {
    repository = createMockRoutinesRepository();
    eventEmitter = { emitAsync: jest.fn().mockResolvedValue([]) };
    const module = await Test.createTestingModule({
      providers: [
        DeleteRoutineUseCase,
        { provide: RoutinesRepository, useValue: repository },
        { provide: ContextService, useValue: createMockContextService() },
        { provide: EventEmitter2, useValue: eventEmitter },
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

  it('announces the deletion so references to the routine (favorites) are removed', async () => {
    repository.delete.mockResolvedValue(true);

    await useCase.execute(new DeleteRoutineCommand(TEST_ROUTINE_ID));

    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      RoutineDeletedEvent.EVENT_NAME,
      new RoutineDeletedEvent(TEST_ROUTINE_ID, TEST_USER_ID),
    );
  });

  it("reports another user's routine as not found and announces nothing", async () => {
    repository.delete.mockResolvedValue(false);

    await expect(
      useCase.execute(new DeleteRoutineCommand(TEST_ROUTINE_ID)),
    ).rejects.toThrow(RoutineNotFoundError);
    expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
  });
});
