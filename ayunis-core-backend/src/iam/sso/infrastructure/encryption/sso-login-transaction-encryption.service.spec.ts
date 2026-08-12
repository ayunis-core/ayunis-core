import { SsoLoginTransactionEncryptionService } from 'src/iam/sso/infrastructure/encryption/sso-login-transaction-encryption.service';

describe('SsoLoginTransactionEncryptionService', () => {
  it('encrypts and authenticates the PKCE verifier and nonce', () => {
    const service = buildService('a'.repeat(64));
    const plaintext = JSON.stringify({
      codeVerifier: 'pkce-verifier',
      nonce: 'oidc-nonce',
    });

    const encrypted = service.encrypt(plaintext);

    expect(encrypted).not.toContain('pkce-verifier');
    expect(service.decrypt(encrypted)).toBe(plaintext);
  });

  it('rejects a tampered transaction payload', () => {
    const service = buildService('a'.repeat(64));
    const encrypted = service.encrypt('sensitive-login-state');
    const tampered = `${encrypted.slice(0, -2)}AA`;

    expect(() => service.decrypt(tampered)).toThrow();
  });

  it('refuses use while the broker is not configured', () => {
    const service = buildService(undefined);

    expect(() => service.encrypt('sensitive-login-state')).toThrow(
      'Municipal SSO is not configured',
    );
  });
});

function buildService(
  key: string | undefined,
): SsoLoginTransactionEncryptionService {
  return new SsoLoginTransactionEncryptionService({
    get: jest.fn().mockReturnValue(key),
  } as never);
}
