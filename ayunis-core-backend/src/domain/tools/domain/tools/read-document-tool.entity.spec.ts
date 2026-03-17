import { ReadDocumentTool } from './read-document-tool.entity';
import { ToolType } from '../value-objects/tool-type.enum';

describe('ReadDocumentTool', () => {
  let tool: ReadDocumentTool;

  beforeEach(() => {
    tool = new ReadDocumentTool();
  });

  it('should have the correct tool type and name', () => {
    expect(tool.type).toBe(ToolType.READ_DOCUMENT);
    expect(tool.name).toBe('read_document');
  });

  it('should include a descriptionLong explaining when to use it', () => {
    expect(tool.descriptionLong).toBeDefined();
    expect(tool.descriptionLong).toContain('read_document');
    expect(tool.descriptionLong).toContain('expected_version');
  });

  describe('validateParams', () => {
    it('should accept valid parameters with artifact_id', () => {
      const params = {
        artifact_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = tool.validateParams(params);

      expect(result.artifact_id).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should reject parameters missing artifact_id', () => {
      expect(() => tool.validateParams({})).toThrow();
    });

    it('should reject additional properties', () => {
      const params = {
        artifact_id: '550e8400-e29b-41d4-a716-446655440000',
        extra: 'not allowed',
      };

      expect(() => tool.validateParams(params)).toThrow();
    });
  });

  it('should not return PII', () => {
    expect(tool.returnsPii).toBe(false);
  });
});
