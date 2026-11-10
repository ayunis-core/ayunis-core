/**
 * Registry of non-browser clients that receive their session as tokens in the
 * response body instead of cookies. The value travels as the access token's
 * `client` claim and is stored on the refresh-token row, so it survives
 * rotation. Adding a client is a data change: extend this list and mark the
 * routes it may call with `@AllowedClients(...)`.
 */
export const SESSION_CLIENTS = ['outlook'] as const;

export type SessionClient = (typeof SESSION_CLIENTS)[number];

export function isSessionClient(value: unknown): value is SessionClient {
  return (
    typeof value === 'string' &&
    (SESSION_CLIENTS as readonly string[]).includes(value)
  );
}
