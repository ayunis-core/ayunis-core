import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { McpCredentialEncryptionService } from './mcp-credential-encryption.service';

describe('McpCredentialEncryptionService', () => {
  let service: McpCredentialEncryptionService;
  let configService: ConfigService;

  const mockEncryptionKey =
    'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789'; // 64 hex chars = 32 bytes

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McpCredentialEncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'MCP_ENCRYPTION_KEY') {
                return mockEncryptionKey;
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<McpCredentialEncryptionService>(
      McpCredentialEncryptionService,
    );
    configService = module.get<ConfigService>(ConfigService);
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encrypt', () => {
    it('should encrypt plaintext and produce non-plaintext output', async () => {
      const plaintext = 'my-secret-api-key';
      const encrypted = await service.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('should produce different ciphertext for same plaintext on multiple encryptions (IV randomness)', async () => {
      const plaintext = 'my-secret-api-key';
      const encrypted1 = await service.encrypt(plaintext);
      const encrypted2 = await service.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should throw error when encryption key is missing', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);

      // Re-instantiate service to trigger constructor validation
      expect(() => {
        // eslint-disable-next-line sonarjs/constructor-for-side-effects
        new McpCredentialEncryptionService(configService);
      }).toThrow('MCP_ENCRYPTION_KEY environment variable is not configured');
    });

    it('should throw error when encryption key is empty string', async () => {
      jest.spyOn(configService, 'get').mockReturnValue('');

      expect(() => {
        // eslint-disable-next-line sonarjs/constructor-for-side-effects
        new McpCredentialEncryptionService(configService);
      }).toThrow('MCP_ENCRYPTION_KEY environment variable is not configured');
    });

    it('should throw error when encryption key is invalid length', async () => {
      jest.spyOn(configService, 'get').mockReturnValue('tooshort');

      expect(() => {
        // eslint-disable-next-line sonarjs/constructor-for-side-effects
        new McpCredentialEncryptionService(configService);
      }).toThrow(
        'MCP_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)',
      );
    });
  });

  describe('decrypt', () => {
    it('should correctly decrypt encrypted plaintext (roundtrip test)', async () => {
      const plaintext = 'my-secret-api-key';
      const encrypted = await service.encrypt(plaintext);
      const decrypted = await service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt multiple different values correctly', async () => {
      const plaintext1 = 'api-key-1';
      const plaintext2 = 'bearer-token-xyz';
      const plaintext3 = 'password123!@#';

      const encrypted1 = await service.encrypt(plaintext1);
      const encrypted2 = await service.encrypt(plaintext2);
      const encrypted3 = await service.encrypt(plaintext3);

      expect(await service.decrypt(encrypted1)).toBe(plaintext1);
      expect(await service.decrypt(encrypted2)).toBe(plaintext2);
      expect(await service.decrypt(encrypted3)).toBe(plaintext3);
    });

    it('should fail gracefully with invalid ciphertext', async () => {
      const invalidCiphertext = 'not-a-valid-encrypted-value';

      await expect(service.decrypt(invalidCiphertext)).rejects.toThrow(
        'Failed to decrypt credential',
      );
    });

    it('should fail gracefully with corrupted ciphertext', async () => {
      const plaintext = 'my-secret-api-key';
      const encrypted = await service.encrypt(plaintext);

      // Corrupt the encrypted value
      const corrupted = encrypted.slice(0, -5) + 'XXXXX';

      await expect(service.decrypt(corrupted)).rejects.toThrow(
        'Failed to decrypt credential',
      );
    });

    it('should fail gracefully with empty ciphertext', async () => {
      await expect(service.decrypt('')).rejects.toThrow(
        'Failed to decrypt credential',
      );
    });

    it('should fail gracefully with ciphertext that is too short', async () => {
      // Too short to contain IV + ciphertext + auth tag
      const tooShort = Buffer.from('short').toString('base64');

      await expect(service.decrypt(tooShort)).rejects.toThrow(
        'Failed to decrypt credential',
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty string encryption and decryption', async () => {
      const plaintext = '';
      const encrypted = await service.encrypt(plaintext);
      const decrypted = await service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle very long plaintext', async () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = await service.encrypt(plaintext);
      const decrypted = await service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters and unicode', async () => {
      const plaintext = '!@#$%^&*()_+-={}[]|:";\'<>?,./🔑🚀中文';
      const encrypted = await service.encrypt(plaintext);
      const decrypted = await service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });
});
