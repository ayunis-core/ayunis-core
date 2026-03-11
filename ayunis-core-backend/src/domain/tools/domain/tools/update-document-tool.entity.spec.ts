import { UpdateDocumentTool } from './update-document-tool.entity';
import { ToolType } from '../value-objects/tool-type.enum';

describe('UpdateDocumentTool', () => {
  let tool: UpdateDocumentTool;

  beforeEach(() => {
    tool = new UpdateDocumentTool();
  });

  it('should have the correct tool type and name', () => {
    expect(tool.type).toBe(ToolType.UPDATE_DOCUMENT);
    expect(tool.name).toBe('update_document');
    expect(tool.isDisplayable).toBe(true);
  });

  it('should be executable (hybrid displayable + executable)', () => {
    expect(tool.isExecutable).toBe(true);
  });

  it('should include a descriptionLong distinguishing create vs update', () => {
    expect(tool.descriptionLong).toBeDefined();
    expect(tool.descriptionLong).toContain('create_document');
    expect(tool.descriptionLong).toContain('update_document');
  });

  describe('validateParams', () => {
    it('should accept valid parameters with artifact_id and content', () => {
      const params = {
        artifact_id: '550e8400-e29b-41d4-a716-446655440000',
        content: '<h1>Updated Report</h1><p>Revised findings...</p>',
      };

      const result = tool.validateParams(params);

      expect(result.artifact_id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.content).toBe(
        '<h1>Updated Report</h1><p>Revised findings...</p>',
      );
    });

    it('should reject parameters missing artifact_id', () => {
      const params = {
        content: '<p>Some content</p>',
      };

      expect(() => tool.validateParams(params)).toThrow();
    });

    it('should reject parameters missing content', () => {
      const params = {
        artifact_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      expect(() => tool.validateParams(params)).toThrow();
    });

    it('should reject empty parameters', () => {
      expect(() => tool.validateParams({})).toThrow();
    });

    it('should reject additional properties', () => {
      const params = {
        artifact_id: '550e8400-e29b-41d4-a716-446655440000',
        content: '<p>Content</p>',
        title: 'not allowed here',
      };

      expect(() => tool.validateParams(params)).toThrow();
    });
  });

  it('should not return PII', () => {
    expect(tool.returnsPii).toBe(false);
  });
});
