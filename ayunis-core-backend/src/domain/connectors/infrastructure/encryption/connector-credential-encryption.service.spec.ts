import type { ConfigService } from '@nestjs/config';
import { ConnectorCredentialEncryptionService } from './connector-credential-encryption.service';

const KEY = '0123456789abcdef'.repeat(4);
const OTHER_KEY = 'fedcba9876543210'.repeat(4);
const SECRET = 'Zq8~client-secret-value';

function serviceWithKey(
  key: string | undefined,
): ConnectorCredentialEncryptionService {
  const config = { get: () => key } as unknown as ConfigService;
  return new ConnectorCredentialEncryptionService(config);
}

describe('ConnectorCredentialEncryptionService', () => {
  it('stores credentials unreadable and decrypts them back', async () => {
    const service = serviceWithKey(KEY);

    const ciphertext = await service.encrypt(SECRET);

    expect(ciphertext).not.toContain(SECRET);
    expect(Buffer.from(ciphertext, 'base64').toString('utf8')).not.toContain(
      SECRET,
    );
    await expect(service.decrypt(ciphertext)).resolves.toBe(SECRET);
  });

  it('encrypts the same credentials differently each time', async () => {
    const service = serviceWithKey(KEY);

    expect(await service.encrypt(SECRET)).not.toBe(
      await service.encrypt(SECRET),
    );
  });

  it('rejects ciphertext that was altered', async () => {
    const service = serviceWithKey(KEY);
    const bytes = Buffer.from(await service.encrypt(SECRET), 'base64');
    bytes[20] ^= 0xff;

    await expect(service.decrypt(bytes.toString('base64'))).rejects.toThrow();
  });

  it('rejects ciphertext encrypted under another key', async () => {
    const ciphertext = await serviceWithKey(OTHER_KEY).encrypt(SECRET);

    await expect(serviceWithKey(KEY).decrypt(ciphertext)).rejects.toThrow();
  });

  it('fails on use instead of at startup when no key is configured', async () => {
    const service = serviceWithKey(undefined);

    await expect(service.encrypt(SECRET)).rejects.toThrow(
      /CONNECTOR_ENCRYPTION_KEY is not configured/,
    );
    await expect(service.decrypt('ciphertext')).rejects.toThrow(
      /CONNECTOR_ENCRYPTION_KEY is not configured/,
    );
  });
});
