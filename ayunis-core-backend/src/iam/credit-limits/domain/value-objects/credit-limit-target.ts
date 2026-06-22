import type { UUID } from 'crypto';
import type { CreditLimitScope } from './credit-limit-scope.enum';

export type CreditLimitTarget =
  | { readonly scope: CreditLimitScope.USER; readonly userId: UUID }
  | { readonly scope: CreditLimitScope.TEAM; readonly teamId: UUID };
