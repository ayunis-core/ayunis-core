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

  it('should include a descriptionLong distinguishing create vs update and mentioning expected_version', () => {
    expect(tool.descriptionLong).toBeDefined();
    expect(tool.descriptionLong).toContain('create_document');
    expect(tool.descriptionLong).toContain('update_document');
    expect(tool.descriptionLong).toContain('expected_version');
  });

  describe('validateParams', () => {
    it('should accept valid parameters with artifact_id, content, and expected_version', () => {
      const params = {
        artifact_id: '550e8400-e29b-41d4-a716-446655440000',
        content: '<h1>Updated Report</h1><p>Revised findings...</p>',
        expected_version: 3,
      };

      const result = tool.validateParams(params);

      expect(result.artifact_id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.content).toBe(
        '<h1>Updated Report</h1><p>Revised findings...</p>',
      );
      expect(result.expected_version).toBe(3);
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
        expected_version: 1,
      };

      expect(() => tool.validateParams(params)).toThrow();
    });

    it('should reject parameters missing expected_version', () => {
      const params = {
        artifact_id: '550e8400-e29b-41d4-a716-446655440000',
        content: '<p>Content</p>',
      };

      expect(() => tool.validateParams(params)).toThrow();
    });

    it('should reject empty parameters', () => {
      expect(() => tool.validateParams({})).toThrow();
    });

    it('should accept valid parameters with optional letterhead_id', () => {
      const params = {
        artifact_id: '550e8400-e29b-41d4-a716-446655440000',
        content: '<h1>Updated Letter</h1><p>New content</p>',
        letterhead_id: '660e8400-e29b-41d4-a716-446655440000',
      };

      const result = tool.validateParams(params);

      expect(result.artifact_id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.letterhead_id).toBe('660e8400-e29b-41d4-a716-446655440000');
    });

    it('should accept valid parameters without letterhead_id', () => {
      const params = {
        artifact_id: '550e8400-e29b-41d4-a716-446655440000',
        content: '<p>Updated content</p>',
      };

      const result = tool.validateParams(params);

      expect(result.artifact_id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.letterhead_id).toBeUndefined();
    });

    it('should reject additional properties', () => {
      const params = {
        artifact_id: '550e8400-e29b-41d4-a716-446655440000',
        content: '<p>Content</p>',
        expected_version: 1,
        title: 'not allowed here',
      };

      expect(() => tool.validateParams(params)).toThrow();
    });
  });

  it('should not return PII', () => {
    expect(tool.returnsPii).toBe(false);
  });
});
