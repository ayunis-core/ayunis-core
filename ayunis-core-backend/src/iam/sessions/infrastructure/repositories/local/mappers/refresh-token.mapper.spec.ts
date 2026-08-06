import { RefreshTokenMapper } from './refresh-token.mapper';
import { aRefreshToken } from 'src/iam/sessions/application/testing/refresh-token.fixtures';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';

describe('RefreshTokenMapper', () => {
  it('preserves SSO authentication provenance in both directions', () => {
    const token = aRefreshToken({
      authenticationMethod: SessionAuthenticationMethod.SSO,
    });

    const record = RefreshTokenMapper.toRecord(token);
    expect(record.authenticationMethod).toBe(SessionAuthenticationMethod.SSO);

    const mapped = RefreshTokenMapper.toDomain(record);
    expect(mapped.authenticationMethod).toBe(SessionAuthenticationMethod.SSO);
  });
});
