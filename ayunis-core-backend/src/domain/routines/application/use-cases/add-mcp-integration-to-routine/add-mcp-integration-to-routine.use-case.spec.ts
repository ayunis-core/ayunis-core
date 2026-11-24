jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));
import type { UUID } from 'crypto';
import { createMockContextService } from 'src/common/context/testing/context.fixtures';
import {
  RoutineIntegrationUnavailableError,
  RoutineNotFoundError,
} from 'src/domain/routines/application/routines.errors';
import {
  TEST_ROUTINE_ID,
  aRoutine,
  createMockRoutinesRepository,
} from 'src/domain/routines/application/testing/routine.fixtures';
import { AddMcpIntegrationToRoutineCommand } from './add-mcp-integration-to-routine.command';
import { AddMcpIntegrationToRoutineUseCase } from './add-mcp-integration-to-routine.use-case';

const tickets = '88888888-8888-4888-8888-888888888888' as UUID;

describe('AddMcpIntegrationToRoutineUseCase', () => {
  const repository = createMockRoutinesRepository();
  const integrationService = { assertAddable: jest.fn() };
  const useCase = new AddMcpIntegrationToRoutineUseCase(
    repository,
    integrationService as never,
    createMockContextService(),
  );
  const add = () =>
    useCase.execute(
      new AddMcpIntegrationToRoutineCommand(TEST_ROUTINE_ID, tickets),
    );

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findByIdForUpdate.mockResolvedValue(aRoutine());
    integrationService.assertAddable.mockResolvedValue(undefined);
  });

  it('stores nothing for an integration the user cannot use', async () => {
    integrationService.assertAddable.mockRejectedValue(
      new RoutineIntegrationUnavailableError(tickets),
    );

    await expect(add()).rejects.toThrow(RoutineIntegrationUnavailableError);
    expect(repository.addMcpIntegration).not.toHaveBeenCalled();
  });

  it('accepts an integration the routine already has, even once it became unavailable', async () => {
    repository.findByIdForUpdate.mockResolvedValue(
      aRoutine({ mcpIntegrationIds: [tickets] }),
    );
    integrationService.assertAddable.mockRejectedValue(
      new RoutineIntegrationUnavailableError(tickets),
    );

    await expect(add()).resolves.toBeUndefined();
  });

  it("reports another user's routine as not found", async () => {
    repository.findByIdForUpdate.mockResolvedValue(null);

    await expect(add()).rejects.toThrow(RoutineNotFoundError);
    expect(repository.addMcpIntegration).not.toHaveBeenCalled();
  });
});
