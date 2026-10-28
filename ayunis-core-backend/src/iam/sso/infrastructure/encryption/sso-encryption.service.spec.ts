import { SsoEncryptionService } from 'src/iam/sso/infrastructure/encryption/sso-encryption.service';

describe(SsoEncryptionService.name, () => {
  it('encrypts and authenticates sensitive SSO values', () => {
    const service = buildService('a'.repeat(64));
    const plaintext = 'signed-id-token';

    const encrypted = service.encrypt(plaintext);

    expect(encrypted).not.toContain(plaintext);
    expect(service.decrypt(encrypted)).toBe(plaintext);
  });

  it('rejects a tampered encrypted value', () => {
    const service = buildService('a'.repeat(64));
    const encrypted = service.encrypt('sensitive-login-state');
    const payload = Buffer.from(encrypted, 'base64url');
    payload[12] ^= 1;
    const tampered = payload.toString('base64url');

    expect(() => service.decrypt(tampered)).toThrow();
  });

  it('refuses use while the broker is not configured', () => {
    const service = buildService(undefined);

    expect(() => service.encrypt('sensitive-login-state')).toThrow(
      'Municipal SSO is not configured',
    );
  });
});

function buildService(key: string | undefined): SsoEncryptionService {
  return new SsoEncryptionService({
    get: jest.fn().mockReturnValue(key),
  } as never);
}
