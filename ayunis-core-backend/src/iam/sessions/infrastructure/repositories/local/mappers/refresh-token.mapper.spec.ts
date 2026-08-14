import { RefreshTokenMapper } from './refresh-token.mapper';
import { aRefreshToken } from 'src/iam/sessions/application/testing/refresh-token.fixtures';
import { SessionAuthenticationMethod } from 'src/iam/sessions/domain/value-objects/session-authentication-method.enum';

describe('RefreshTokenMapper', () => {
  it('preserves SSO provenance in both directions', () => {
    const token = aRefreshToken({
      authenticationMethod: SessionAuthenticationMethod.SSO,
      zitadelSessionId: 'zitadel-session-id',
    });

    const record = RefreshTokenMapper.toRecord(token);
    expect(record.authenticationMethod).toBe(SessionAuthenticationMethod.SSO);
    expect(record.zitadelSessionId).toBe('zitadel-session-id');

    const mapped = RefreshTokenMapper.toDomain(record);
    expect(mapped.authenticationMethod).toBe(SessionAuthenticationMethod.SSO);
    expect(mapped.zitadelSessionId).toBe('zitadel-session-id');
  });
});
