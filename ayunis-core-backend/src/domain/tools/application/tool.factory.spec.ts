import { ToolFactory } from './tool.factory';
import {
  HttpToolConfig,
  HttpToolMethod,
  HttpTool,
} from '../domain/tools/http-tool.entity';
import { ToolType } from '../domain/value-objects/tool-type.enum';
import { UUID } from 'crypto';
import { InternetSearchTool } from '../domain/tools/internet-search-tool.entity';
import { SourceQueryTool } from '../domain/tools/source-query-tool.entity';
import { WebsiteContentTool } from '../domain/tools/website-content-tool.entity';

describe('ToolFactory', () => {
  let factory: ToolFactory;

  beforeEach(() => {
    factory = new ToolFactory();
  });

  describe('createTool', () => {
    it('should create an HttpTool from HttpToolConfig', () => {
      const config = new HttpToolConfig({
        displayName: 'Test HTTP Tool',
        description: 'A test HTTP tool for testing purposes',
        userId: '123' as UUID,
        method: HttpToolMethod.GET,
        endpointUrl: 'https://api.example.com/test',
      });

      const tool = factory.createTool(ToolType.HTTP, config) as HttpTool;

      expect(tool).toBeInstanceOf(HttpTool);
      expect(tool.name).toBe('http_test_http_tool');
      expect(tool.config).toBe(config);
    });

    it('should create an InternetSearchTool', () => {
      const tool = factory.createTool(ToolType.INTERNET_SEARCH);
      expect(tool).toBeInstanceOf(InternetSearchTool);
    });

    it('should create an SourceQueryTool', () => {
      const tool = factory.createTool(ToolType.SOURCE_QUERY);
      expect(tool).toBeInstanceOf(SourceQueryTool);
    });

    it('should create a WebsiteContentTool', () => {
      const tool = factory.createTool(ToolType.WEBSITE_CONTENT);
      expect(tool).toBeInstanceOf(WebsiteContentTool);
    });

    it('should throw error for unsupported tool type', () => {
      expect(() =>
        factory.createTool('UNSUPPORTED' as unknown as ToolType),
      ).toThrow('Unsupported tool type: UNSUPPORTED');
    });

    it('should throw error for invalid config type', () => {
      const invalidConfig = {
        displayName: 'Test Tool',
      } as unknown as HttpToolConfig;

      expect(() => factory.createTool(ToolType.HTTP, invalidConfig)).toThrow(
        'Invalid config type for HTTP tool',
      );
    });
  });

  describe('supportedToolTypes', () => {
    it('should return all supported tool types', () => {
      const types = factory.supportedToolTypes();

      expect(types).toContain(ToolType.HTTP);
      expect(types).toContain(ToolType.SOURCE_QUERY);
      expect(types).toContain(ToolType.INTERNET_SEARCH);
      expect(types).toContain(ToolType.WEBSITE_CONTENT);

      expect(types.length).toBe(4);
    });
  });
});
