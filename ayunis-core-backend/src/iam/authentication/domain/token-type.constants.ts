/**
 * Discriminates a refresh token from every other JWT signed with the shared
 * secret. New refresh tokens carry this `type` claim; the access token stays
 * untyped (JwtStrategy rejects any typed token presented as an access token).
 * Kept at the domain layer so both the infrastructure adapter that signs
 * tokens and the application use case that verifies them can import it.
 */
export const REFRESH_TOKEN_TYPE = 'refresh' as const;
