import type { UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';

/** Puts a job's org and user on the context downstream use cases read. */
export function setJobContext(
  contextService: ContextService,
  orgId: UUID | undefined,
  userId: UUID | undefined,
): void {
  if (!orgId) throw new Error('orgId is required');
  if (!userId) throw new Error('userId is required');
  contextService.set('orgId', orgId);
  contextService.set('userId', userId);
}
