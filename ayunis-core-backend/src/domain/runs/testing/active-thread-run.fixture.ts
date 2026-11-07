import type { UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import type { RunEvent } from 'src/domain/runs/application/run-events';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export const RUN_THREAD_ID = '3f1c2a7e-5b4d-4e8f-9a6c-0d2e4f6a8b1c' as UUID;
export const RUN_OWNER_ID = 'b6a1c3e5-7d9f-4b2a-8c4e-6f8a0b2c4d6e' as UUID;
export const OTHER_USER_ID = 'c7b2d4f6-8e0a-4c3b-9d5f-7a9b1c3d5e7f' as UUID;
const ORG_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' as UUID;

/** A ContextService double whose current user can be switched per test. */
export function userContextFor(userId: UUID): ContextService {
  const values: Record<string, unknown> = {
    userId,
    orgId: ORG_ID,
    role: UserRole.USER,
    systemRole: SystemRole.CUSTOMER,
  };
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ContextService;
}

/** A detached run source that stays open until aborted. */
export async function* runUntilAborted(
  signal: AbortSignal,
): AsyncGenerator<RunEvent> {
  yield {
    type: 'session',
    streaming: true,
    threadId: RUN_THREAD_ID,
    timestamp: '2026-11-07T09:30:00.000Z',
  };
  await new Promise<void>((resolve) =>
    signal.addEventListener('abort', () => resolve(), { once: true }),
  );
}
