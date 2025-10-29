import { Test, TestingModule } from '@nestjs/testing';
import {
  PredefinedMcpIntegrationRegistryService,
  PredefinedMcpIntegrationConfig,
} from './predefined-mcp-integration-registry.service';
import { PredefinedMcpIntegrationSlug } from '../../domain/predefined-mcp-integration-slug.enum';

describe('PredefinedMcpIntegrationRegistryService', () => {
  let service: PredefinedMcpIntegrationRegistryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PredefinedMcpIntegrationRegistryService],
    }).compile();

    service = module.get<PredefinedMcpIntegrationRegistryService>(
      PredefinedMcpIntegrationRegistryService,
    );
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
      expect(config.url).toBe('http://localhost:3100/mcp');
      expect(config.defaultAuthMethod).toBeUndefined();
      expect(config.defaultAuthHeaderName).toBeUndefined();
    });

    it('should throw error for unknown slug', () => {
      const unknownSlug = 'UNKNOWN_SLUG' as PredefinedMcpIntegrationSlug;

      expect(() => service.getConfig(unknownSlug)).toThrow(
        'Unknown predefined MCP integration slug: UNKNOWN_SLUG',
      );
    });
  });

  describe('getAllConfigs', () => {
    it('should return array with TEST config', () => {
      const configs = service.getAllConfigs();

      expect(configs).toBeInstanceOf(Array);
      expect(configs.length).toBeGreaterThanOrEqual(1);

      const testConfig = configs.find(
        (c) => c.slug === PredefinedMcpIntegrationSlug.TEST,
      );
      expect(testConfig).toBeDefined();
      expect(testConfig?.displayName).toBe('Test MCP Server');
    });

    it('should return all configs with required fields', () => {
      const configs = service.getAllConfigs();

      configs.forEach((config) => {
        expect(config.slug).toBeDefined();
        expect(config.displayName).toBeDefined();
        expect(config.description).toBeDefined();
        expect(config.url).toBeDefined();
      });
    });
  });

  describe('isValidSlug', () => {
    it('should return true for TEST slug', () => {
      const result = service.isValidSlug('TEST');

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
  });

  describe('Injectable', () => {
    it('should be instantiable by NestJS DI', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [PredefinedMcpIntegrationRegistryService],
      }).compile();

      const instance = module.get<PredefinedMcpIntegrationRegistryService>(
        PredefinedMcpIntegrationRegistryService,
      );

      expect(instance).toBeInstanceOf(PredefinedMcpIntegrationRegistryService);
    });
  });
});
