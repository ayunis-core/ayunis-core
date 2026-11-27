import type { ContextService } from 'src/common/context/services/context.service';
import type { SessionClient } from 'src/iam/sessions/domain/value-objects/session-client';

export function getCurrentSessionClient(
  contextService: ContextService,
): SessionClient | null {
  return contextService.get('client') ?? null;
}
