import type { ActiveUser } from './active-user.entity';
import type { ActiveApiKey } from './active-api-key.entity';

export type PrincipalKind = 'user' | 'apiKey';

/**
 * Authenticated caller of a request — either a logged-in user (`ActiveUser`)
 * or an API key (`ActiveApiKey`). Modelled as a discriminated union on `kind`
 * so consumers can narrow with a single check.
 */
export type ActivePrincipal = ActiveUser | ActiveApiKey;
