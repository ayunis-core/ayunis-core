import { CreateDocumentTool } from './create-document-tool.entity';
import { ToolType } from '../value-objects/tool-type.enum';

describe('CreateDocumentTool', () => {
  let tool: CreateDocumentTool;

  beforeEach(() => {
    tool = new CreateDocumentTool();
  });

  it('should have the correct tool type and name', () => {
    expect(tool.type).toBe(ToolType.CREATE_DOCUMENT);
    expect(tool.name).toBe('create_document');
    expect(tool.isDisplayable).toBe(true);
  });

  it('should be executable (hybrid displayable + executable)', () => {
    expect(tool.isExecutable).toBe(true);
  });

  describe('validateParams', () => {
    it('should accept valid parameters with title and content', () => {
      const params = {
        title: 'Meeting Notes Q1 2026',
        content: '<h1>Meeting Notes</h1><p>Discussion points...</p>',
      };

      const result = tool.validateParams(params);

      expect(result.title).toBe('Meeting Notes Q1 2026');
      expect(result.content).toBe(
        '<h1>Meeting Notes</h1><p>Discussion points...</p>',
      );
    });

    it('should reject parameters missing title', () => {
      const params = {
        content: '<p>Some content</p>',
      };

      expect(() => tool.validateParams(params)).toThrow();
    });

    it('should reject parameters missing content', () => {
      const params = {
        title: 'A Document',
      };

      expect(() => tool.validateParams(params)).toThrow();
    });

    it('should reject empty parameters', () => {
      expect(() => tool.validateParams({})).toThrow();
    });

    it('should accept valid parameters with optional letterhead_id', () => {
      const params = {
        title: 'Official Letter',
        content: '<h1>Dear Sir</h1><p>Body text...</p>',
        letterhead_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = tool.validateParams(params);

      expect(result.title).toBe('Official Letter');
      expect(result.letterhead_id).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should accept valid parameters without letterhead_id', () => {
      const params = {
        title: 'Casual Note',
        content: '<p>Just a note</p>',
      };

      const result = tool.validateParams(params);

      expect(result.title).toBe('Casual Note');
      expect(result.letterhead_id).toBeUndefined();
    });

    it('should reject additional properties', () => {
      const params = {
        title: 'Doc Title',
        content: '<p>Content</p>',
        extra: 'not allowed',
      };

      expect(() => tool.validateParams(params)).toThrow();
    });
  });

  it('should not return PII', () => {
    expect(tool.returnsPii).toBe(false);
  });
});
