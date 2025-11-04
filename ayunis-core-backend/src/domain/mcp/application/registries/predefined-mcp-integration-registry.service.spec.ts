import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PredefinedMcpIntegrationRegistry } from './predefined-mcp-integration-registry.service';
import { PredefinedMcpIntegrationSlug } from '../../domain/value-objects/predefined-mcp-integration-slug.enum';
import { McpAuthMethod } from '../../domain/value-objects/mcp-auth-method.enum';
import { CredentialFieldType } from '../../domain/predefined-mcp-integration-config';

describe('PredefinedMcpIntegrationRegistryService', () => {
  let service: PredefinedMcpIntegrationRegistry;
  let configService: ConfigService;

  describe('with Locaboo 4 URL configured', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PredefinedMcpIntegrationRegistry,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'LOCABOO_4_URL') {
                  return 'https://api.locaboo.example.com';
                }
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      service = module.get<PredefinedMcpIntegrationRegistry>(
        PredefinedMcpIntegrationRegistry,
      );
      configService = module.get<ConfigService>(ConfigService);
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    describe('getConfig', () => {
      it('should return correct config for TEST slug', () => {
        const config = service.getConfig(PredefinedMcpIntegrationSlug.TEST);

        expect(config).toBeDefined();
        expect(config.slug).toBe(PredefinedMcpIntegrationSlug.TEST);
        expect(config.displayName).toBe('Test MCP Server');
        expect(config.description).toBe(
          'Test integration for development and testing',
        );
        expect(config.authType).toBe(McpAuthMethod.NO_AUTH);
        expect(config.authHeaderName).toBeUndefined();
        expect(config.credentialFields).toBeUndefined();
      });

      it('should return correct config for LOCABOO slug with Bearer token auth', () => {
        const config = service.getConfig(PredefinedMcpIntegrationSlug.LOCABOO);

        expect(config).toBeDefined();
        expect(config.slug).toBe(PredefinedMcpIntegrationSlug.LOCABOO);
        expect(config.displayName).toBe('Locaboo 4');
        expect(config.description).toContain('Locaboo 4 booking system');
        expect(config.authType).toBe(McpAuthMethod.BEARER_TOKEN);
        expect(config.authHeaderName).toBe('Authorization');
        expect(config.serverUrl).toBe('https://api.locaboo.example.com/mcp');
      });

      it('should return Locaboo credential fields', () => {
        const config = service.getConfig(PredefinedMcpIntegrationSlug.LOCABOO);

        expect(config.credentialFields).toBeDefined();
        expect(config.credentialFields).toHaveLength(1);

        const tokenField = config.credentialFields![0];
        expect(tokenField.label).toBe('Locaboo 3 API Token');
        expect(tokenField.type).toBe(CredentialFieldType.TOKEN);
        expect(tokenField.required).toBe(true);
        expect(tokenField.help).toContain('Locaboo 3 API token');
      });

      it('should throw error for unknown slug', () => {
        const unknownSlug = 'UNKNOWN_SLUG' as PredefinedMcpIntegrationSlug;

        expect(() => service.getConfig(unknownSlug)).toThrow(
          'Unknown predefined MCP integration slug: UNKNOWN_SLUG',
        );
      });
    });

    describe('getAllConfigs', () => {
      it('should return array with all configs', () => {
        const configs = service.getAllConfigs();

        expect(configs).toBeInstanceOf(Array);
        expect(configs.length).toBeGreaterThanOrEqual(2); // TEST and LOCABOO
      });

      it('should include TEST config', () => {
        const configs = service.getAllConfigs();

        const testConfig = configs.find(
          (c) => c.slug === PredefinedMcpIntegrationSlug.TEST,
        );
        expect(testConfig).toBeDefined();
        expect(testConfig?.displayName).toBe('Test MCP Server');
        expect(testConfig?.authType).toBe(McpAuthMethod.NO_AUTH);
      });

      it('should include LOCABOO config', () => {
        const configs = service.getAllConfigs();

        const locabooConfig = configs.find(
          (c) => c.slug === PredefinedMcpIntegrationSlug.LOCABOO,
        );
        expect(locabooConfig).toBeDefined();
        expect(locabooConfig?.displayName).toBe('Locaboo 4');
        expect(locabooConfig?.authType).toBe(McpAuthMethod.BEARER_TOKEN);
      });

      it('should return all configs with required fields', () => {
        const configs = service.getAllConfigs();

        configs.forEach((config) => {
          expect(config.slug).toBeDefined();
          expect(config.displayName).toBeDefined();
          expect(config.description).toBeDefined();
          expect(config.authType).toBeDefined();
        });
      });
    });

    describe('isValidSlug', () => {
      it('should return true for TEST slug', () => {
        const result = service.isValidSlug('TEST');
        expect(result).toBe(true);
      });

      it('should return true for LOCABOO slug', () => {
        const result = service.isValidSlug('LOCABOO');
        expect(result).toBe(true);
      });

      it('should return false for invalid slug', () => {
        const result = service.isValidSlug('INVALID_SLUG');
        expect(result).toBe(false);
      });

      it('should return false for empty string', () => {
        const result = service.isValidSlug('');
        expect(result).toBe(false);
      });

      it('should return false for null', () => {
        const result = service.isValidSlug(null as any);
        expect(result).toBe(false);
      });
    });

    describe('getServerUrl', () => {
      it('should return Locaboo MCP endpoint URL from environment', () => {
        const url = service.getServerUrl(PredefinedMcpIntegrationSlug.LOCABOO);

        expect(url).toBe('https://api.locaboo.example.com/mcp');
        expect(configService.get).toHaveBeenCalledWith('LOCABOO_4_URL');
      });

      it('should return hardcoded test server URL', () => {
        const url = service.getServerUrl(PredefinedMcpIntegrationSlug.TEST);

        expect(url).toBe('http://localhost:3100/mcp');
      });

      it('should throw error for unknown slug', () => {
        const unknownSlug = 'UNKNOWN' as PredefinedMcpIntegrationSlug;

        expect(() => service.getServerUrl(unknownSlug)).toThrow(
          'No server URL configured for integration: UNKNOWN',
        );
      });
    });
  });

  describe('without Locaboo 4 URL configured', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PredefinedMcpIntegrationRegistry,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      service = module.get<PredefinedMcpIntegrationRegistry>(
        PredefinedMcpIntegrationRegistry,
      );
      configService = module.get<ConfigService>(ConfigService);
    });

    it('should not register Locaboo config when LOCABOO_4_URL is missing', () => {
      const configs = service.getAllConfigs();

      const locabooConfig = configs.find(
        (c) => c.slug === PredefinedMcpIntegrationSlug.LOCABOO,
      );
      expect(locabooConfig).toBeUndefined();
    });

    it('should still include TEST config when LOCABOO_4_URL is missing', () => {
      const configs = service.getAllConfigs();

      const testConfig = configs.find(
        (c) => c.slug === PredefinedMcpIntegrationSlug.TEST,
      );
      expect(testConfig).toBeDefined();
    });

    it('should still consider LOCABOO as valid slug even when not configured', () => {
      // isValidSlug checks against the enum, not runtime configs
      // This is correct behavior - we validate schema, not runtime state
      expect(service.isValidSlug('TEST')).toBe(true);
      expect(service.isValidSlug('LOCABOO')).toBe(true);
    });

    it('should throw error when getting Locaboo config if not registered', () => {
      expect(() =>
        service.getConfig(PredefinedMcpIntegrationSlug.LOCABOO),
      ).toThrow('Unknown predefined MCP integration slug: LOCABOO');
    });

    it('should throw error when getting Locaboo URL if not configured', () => {
      expect(() =>
        service.getServerUrl(PredefinedMcpIntegrationSlug.LOCABOO),
      ).toThrow('LOCABOO_4_URL environment variable not configured');
    });
  });

  describe('Injectable', () => {
    it('should be instantiable by NestJS DI with ConfigService', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PredefinedMcpIntegrationRegistry,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'LOCABOO_4_URL') {
                  return 'https://api.example.com';
                }
                return undefined;
              }),
            },
          },
        ],
      }).compile();

      const instance = module.get<PredefinedMcpIntegrationRegistry>(
        PredefinedMcpIntegrationRegistry,
      );

      expect(instance).toBeInstanceOf(PredefinedMcpIntegrationRegistry);
    });
  });
});
