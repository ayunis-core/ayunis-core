import { MarketplaceConfigService } from './marketplace-config.service';
import { McpCredentialEncryptionPort } from '../ports/mcp-credential-encryption.port';
import { ConfigField } from '../../domain/value-objects/integration-config-schema';
import { McpMissingRequiredConfigError } from '../mcp.errors';

describe('MarketplaceConfigService', () => {
  let service: MarketplaceConfigService;
  let encryption: jest.Mocked<McpCredentialEncryptionPort>;

  beforeEach(() => {
    encryption = {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
    } as jest.Mocked<McpCredentialEncryptionPort>;

    encryption.encrypt.mockImplementation(
      async (plaintext) => `encrypted:${plaintext}`,
    );

    service = new MarketplaceConfigService(encryption);
  });

  describe('mergeFixedValues', () => {
    it('should override user-provided values with fixed values from schema', () => {
      const orgFields: ConfigField[] = [
        {
          key: 'authToken',
          label: 'Token',
          type: 'secret',
          required: true,
          value: 'sk-fixed-token',
        },
      ];

      const result = service.mergeFixedValues(
        { authToken: 'user-attempted-override' },
        orgFields,
      );

      expect(result.authToken).toBe('sk-fixed-token');
    });

    it('should preserve user-provided values for fields without fixed values', () => {
      const orgFields: ConfigField[] = [
        {
          key: 'endpointUrl',
          label: 'Endpoint',
          type: 'url',
          required: true,
        },
      ];

      const result = service.mergeFixedValues(
        { endpointUrl: 'https://example.com/api' },
        orgFields,
      );

      expect(result.endpointUrl).toBe('https://example.com/api');
    });

    it('should add fixed values even when user did not provide them', () => {
      const orgFields: ConfigField[] = [
        {
          key: 'systemKey',
          label: 'System Key',
          type: 'text',
          required: true,
          value: 'system-value',
        },
      ];

      const result = service.mergeFixedValues({}, orgFields);

      expect(result.systemKey).toBe('system-value');
    });
  });

  describe('validateRequiredFields', () => {
    it('should not throw when all required fields are present', () => {
      const orgFields: ConfigField[] = [
        {
          key: 'apiKey',
          label: 'API Key',
          type: 'secret',
          required: true,
        },
        {
          key: 'endpoint',
          label: 'Endpoint',
          type: 'url',
          required: true,
        },
      ];

      expect(() =>
        service.validateRequiredFields(orgFields, {
          apiKey: 'key-123',
          endpoint: 'https://example.com',
        }),
      ).not.toThrow();
    });

    it('should throw McpMissingRequiredConfigError when required fields are missing', () => {
      const orgFields: ConfigField[] = [
        {
          key: 'apiKey',
          label: 'API Key',
          type: 'secret',
          required: true,
        },
        {
          key: 'endpoint',
          label: 'Endpoint',
          type: 'url',
          required: true,
        },
      ];

      expect(() =>
        service.validateRequiredFields(orgFields, {
          endpoint: 'https://example.com',
        }),
      ).toThrow(McpMissingRequiredConfigError);
    });

    it('should not throw for missing optional fields', () => {
      const orgFields: ConfigField[] = [
        {
          key: 'optionalField',
          label: 'Optional',
          type: 'text',
          required: false,
        },
      ];

      expect(() => service.validateRequiredFields(orgFields, {})).not.toThrow();
    });

    it('should treat empty string as missing for required fields', () => {
      const orgFields: ConfigField[] = [
        {
          key: 'apiKey',
          label: 'API Key',
          type: 'secret',
          required: true,
        },
      ];

      expect(() =>
        service.validateRequiredFields(orgFields, { apiKey: '' }),
      ).toThrow(McpMissingRequiredConfigError);
    });
  });

  describe('encryptSecretFields', () => {
    it('should encrypt values for secret-type fields', async () => {
      const orgFields: ConfigField[] = [
        {
          key: 'apiToken',
          label: 'API Token',
          type: 'secret',
          required: true,
        },
      ];

      const result = await service.encryptSecretFields(orgFields, {
        apiToken: 'my-secret',
      });

      expect(result.apiToken).toBe('encrypted:my-secret');
      expect(encryption.encrypt).toHaveBeenCalledWith('my-secret');
    });

    it('should not encrypt non-secret fields', async () => {
      const orgFields: ConfigField[] = [
        {
          key: 'endpointUrl',
          label: 'Endpoint',
          type: 'url',
          required: true,
        },
      ];

      const result = await service.encryptSecretFields(orgFields, {
        endpointUrl: 'https://example.com',
      });

      expect(result.endpointUrl).toBe('https://example.com');
      expect(encryption.encrypt).not.toHaveBeenCalled();
    });

    it('should handle mix of secret and non-secret fields', async () => {
      const orgFields: ConfigField[] = [
        {
          key: 'apiToken',
          label: 'Token',
          type: 'secret',
          required: true,
        },
        {
          key: 'endpointUrl',
          label: 'Endpoint',
          type: 'url',
          required: true,
        },
      ];

      const result = await service.encryptSecretFields(orgFields, {
        apiToken: 'secret-value',
        endpointUrl: 'https://example.com',
      });

      expect(result.apiToken).toBe('encrypted:secret-value');
      expect(result.endpointUrl).toBe('https://example.com');
    });
  });

  describe('mergeForUpdate', () => {
    const orgFields: ConfigField[] = [
      {
        key: 'endpointUrl',
        label: 'Endpoint URL',
        type: 'url',
        required: true,
      },
      {
        key: 'apiToken',
        label: 'API Token',
        type: 'secret',
        required: true,
      },
    ];

    it('should update non-secret fields with provided values', async () => {
      const result = await service.mergeForUpdate(
        { endpointUrl: 'https://old.com', apiToken: 'encrypted:old-token' },
        { endpointUrl: 'https://new.com' },
        orgFields,
      );

      expect(result.endpointUrl).toBe('https://new.com');
    });

    it('should retain existing encrypted value when secret field is omitted', async () => {
      const result = await service.mergeForUpdate(
        { endpointUrl: 'https://old.com', apiToken: 'encrypted:old-token' },
        { endpointUrl: 'https://new.com' },
        orgFields,
      );

      expect(result.apiToken).toBe('encrypted:old-token');
      expect(encryption.encrypt).not.toHaveBeenCalled();
    });

    it('should retain existing encrypted value when secret field is empty string', async () => {
      const result = await service.mergeForUpdate(
        { endpointUrl: 'https://old.com', apiToken: 'encrypted:old-token' },
        { endpointUrl: 'https://new.com', apiToken: '' },
        orgFields,
      );

      expect(result.apiToken).toBe('encrypted:old-token');
    });

    it('should encrypt new value when secret field is provided', async () => {
      const result = await service.mergeForUpdate(
        { endpointUrl: 'https://old.com', apiToken: 'encrypted:old-token' },
        { endpointUrl: 'https://old.com', apiToken: 'new-secret-token' },
        orgFields,
      );

      expect(result.apiToken).toBe('encrypted:new-secret-token');
      expect(encryption.encrypt).toHaveBeenCalledWith('new-secret-token');
    });

    it('should preserve fixed-value fields from schema regardless of provided values', async () => {
      const fieldsWithFixed: ConfigField[] = [
        {
          key: 'systemToken',
          label: 'System Token',
          type: 'secret',
          required: true,
          value: 'sk-fixed-system-token',
        },
        {
          key: 'endpointUrl',
          label: 'Endpoint',
          type: 'url',
          required: true,
        },
      ];

      const result = await service.mergeForUpdate(
        {
          systemToken: 'encrypted:sk-fixed-system-token',
          endpointUrl: 'https://old.com',
        },
        {
          systemToken: 'user-override-attempt',
          endpointUrl: 'https://new.com',
        },
        fieldsWithFixed,
      );

      expect(result.systemToken).toBe('encrypted:sk-fixed-system-token');
      expect(result.endpointUrl).toBe('https://new.com');
    });

    it('should throw McpMissingRequiredConfigError when required field ends up missing', async () => {
      const fieldsAllRequired: ConfigField[] = [
        {
          key: 'endpointUrl',
          label: 'Endpoint',
          type: 'url',
          required: true,
        },
      ];

      await expect(
        service.mergeForUpdate({}, {}, fieldsAllRequired),
      ).rejects.toThrow(McpMissingRequiredConfigError);
    });

    it('should keep existing non-secret value when not provided in update', async () => {
      const result = await service.mergeForUpdate(
        { endpointUrl: 'https://old.com', apiToken: 'encrypted:token' },
        { apiToken: 'new-token' },
        orgFields,
      );

      expect(result.endpointUrl).toBe('https://old.com');
    });
  });
});
