import { SetMetadata } from '@nestjs/common';
import type { PrincipalKind } from 'src/iam/authentication/domain/active-principal.entity';

export const REQUIRE_PRINCIPAL_KIND_KEY = 'requirePrincipalKind';

/**
 * Restrict a route (or controller) to a specific principal kind. Returns 403
 * when the authenticated principal's kind does not match.
 *
 * @example
 * ```typescript
 * @RequirePrincipalKind('apiKey')
 * @Controller('openai/v1/chat/completions')
 * export class ChatCompletionsController { ... }
 * ```
 */
export const RequirePrincipalKind = (kind: PrincipalKind) =>
  SetMetadata(REQUIRE_PRINCIPAL_KIND_KEY, kind);
