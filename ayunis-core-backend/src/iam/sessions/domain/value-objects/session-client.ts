import {
  TOKEN_SURFACES,
  type TokenSurfaceId,
} from 'src/config/surface-registry';

// Client IDs are persisted on refresh sessions and sent in the JWT client claim.
export const SESSION_CLIENTS: readonly TokenSurfaceId[] = TOKEN_SURFACES;

export type SessionClient = TokenSurfaceId;

export function isSessionClient(value: unknown): value is SessionClient {
  return (
    typeof value === 'string' &&
    (SESSION_CLIENTS as readonly string[]).includes(value)
  );
}
