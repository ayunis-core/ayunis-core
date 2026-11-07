import { Test } from '@nestjs/testing';
import { ContextService } from 'src/common/context/services/context.service';
import { createMockContextService } from 'src/common/context/testing/context.fixtures';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { RoutinesRepository } from 'src/domain/routines/application/ports/routines.repository';
import { RoutineModelService } from 'src/domain/routines/application/services/routine-model.service';
import {
  TEST_MODEL_ID,
  TEST_ORG_ID,
  TEST_USER_ID,
  createMockRoutinesRepository,
} from 'src/domain/routines/application/testing/routine.fixtures';
import { CreateRoutineCommand } from './create-routine.command';
import { CreateRoutineUseCase } from './create-routine.use-case';

describe('CreateRoutineUseCase', () => {
  let useCase: CreateRoutineUseCase;
  let repository: jest.Mocked<RoutinesRepository>;
  const routineModelService = { select: jest.fn() };

  const command = (overrides: Partial<CreateRoutineCommand> = {}) =>
    new CreateRoutineCommand({
      name: 'Amtsblatt',
      prompt: 'Fasse die heutigen Bekanntmachungen zusammen.',
      dailyTime: '08:00',
      internetEnabled: true,
      ...overrides,
    });

  beforeEach(async () => {
    jest.resetAllMocks();
    repository = createMockRoutinesRepository();
    routineModelService.select.mockResolvedValue(TEST_MODEL_ID);
    const module = await Test.createTestingModule({
      providers: [
        CreateRoutineUseCase,
        { provide: RoutinesRepository, useValue: repository },
        { provide: RoutineModelService, useValue: routineModelService },
        { provide: ContextService, useValue: createMockContextService() },
      ],
    }).compile();
    useCase = module.get(CreateRoutineUseCase);
  });

  it('creates an enabled routine owned by the current user', async () => {
    const routine = await useCase.execute(command());

    expect(routine).toMatchObject({
      userId: TEST_USER_ID,
      orgId: TEST_ORG_ID,
      name: 'Amtsblatt',
      dailyTime: '08:00',
      internetEnabled: true,
      enabled: true,
      modelId: TEST_MODEL_ID,
      lastRunStatus: null,
      consecutiveFailureCount: 0,
    });
    expect(repository.create).toHaveBeenCalledWith(routine);
  });

  it('stores the model the service selected for an omitted model', async () => {
    await useCase.execute(command({ modelId: undefined }));

    expect(routineModelService.select).toHaveBeenCalledWith(undefined);
  });

  it('does not create a routine with a model the user may not use', async () => {
    routineModelService.select.mockRejectedValue(new UnauthorizedAccessError());

    await expect(useCase.execute(command())).rejects.toThrow(
      UnauthorizedAccessError,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });
});
