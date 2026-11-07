import type { UUID } from 'crypto';
import {
  TEST_ORG_ID,
  TEST_USER_ID,
} from 'src/common/context/testing/context.fixtures';
import { Routine } from 'src/domain/routines/domain/routine.entity';
import type { RoutinesRepository } from 'src/domain/routines/application/ports/routines.repository';
import type { RoutineExecutionQueue } from 'src/domain/routines/application/ports/routine-execution-queue.port';

export { TEST_ORG_ID, TEST_USER_ID };
export const TEST_ROUTINE_ID = '44444444-4444-4444-8444-444444444444' as UUID;
export const TEST_MODEL_ID = '55555555-5555-4555-8555-555555555555' as UUID;

export function aRoutine(overrides: Partial<Routine> = {}): Routine {
  return new Routine({
    id: TEST_ROUTINE_ID,
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
    name: 'Verkündungsplattform',
    prompt: 'Prüfe die heutigen Verkündungen im Gesetz- und Verordnungsblatt.',
    modelId: TEST_MODEL_ID,
    dailyTime: '07:30',
    internetEnabled: true,
    enabled: true,
    createdAt: new Date('2026-11-01T08:00:00.000Z'),
    updatedAt: new Date('2026-11-01T08:00:00.000Z'),
    ...overrides,
  });
}

export function createMockRoutinesRepository(): jest.Mocked<RoutinesRepository> {
  return {
    create: jest
      .fn()
      .mockImplementation((routine: Routine) => Promise.resolve(routine)),
    findById: jest.fn().mockResolvedValue(null),
    findByIdForExecution: jest.fn().mockResolvedValue(null),
    findAllByUserId: jest.fn().mockResolvedValue([]),
    updateDefinition: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(false),
    markRunQueued: jest.fn().mockResolvedValue(true),
    setRunStatus: jest.fn().mockResolvedValue(undefined),
    recordRunOutcome: jest.fn().mockResolvedValue(undefined),
  };
}

export function createMockRoutineExecutionQueue(): jest.Mocked<RoutineExecutionQueue> {
  return { enqueueRunNow: jest.fn().mockResolvedValue(undefined) };
}
