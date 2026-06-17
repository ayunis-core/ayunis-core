import { EditDocumentTool } from './edit-document-tool.entity';
import { ToolType } from '../value-objects/tool-type.enum';

describe('EditDocumentTool', () => {
  let tool: EditDocumentTool;

  beforeEach(() => {
    tool = new EditDocumentTool();
  });

  it('should have the correct tool type and name', () => {
    expect(tool.type).toBe(ToolType.EDIT_DOCUMENT);
    expect(tool.name).toBe('edit_document');
    expect(tool.isDisplayable).toBe(true);
  });

  it('should be executable (hybrid displayable + executable)', () => {
    expect(tool.isExecutable).toBe(true);
  });

  it('should include a descriptionLong explaining edit vs update and mentioning expected_version', () => {
    expect(tool.descriptionLong).toBeDefined();
    expect(tool.descriptionLong).toContain('edit_document');
    expect(tool.descriptionLong).toContain('update_document');
    expect(tool.descriptionLong).toContain('search-and-replace');
    expect(tool.descriptionLong).toContain('expected_version');
  });

  describe('validateParams', () => {
    it('should accept valid parameters with artifact_id, expected_version, and edits', () => {
      const params = {
        artifact_id: '550e8400-e29b-41d4-a716-446655440000',
        expected_version: 2,
        edits: [
          { old_text: 'Hello', new_text: 'Hi' },
          { old_text: 'world', new_text: 'universe' },
        ],
      };

      const result = tool.validateParams(params);

      expect(result.artifact_id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.expected_version).toBe(2);
      expect(result.edits).toHaveLength(2);
      expect(result.edits[0]).toEqual({ old_text: 'Hello', new_text: 'Hi' });
      expect(result.edits[1]).toEqual({
        old_text: 'world',
        new_text: 'universe',
      });
    });

    it('should reject parameters missing artifact_id', () => {
      const params = {
        edits: [{ old_text: 'test', new_text: 'replacement' }],
      };

      expect(() => tool.validateParams(params)).toThrow();
    });

    it('should reject parameters missing edits', () => {
      const params = {
        artifact_id: '550e8400-e29b-41d4-a716-446655440000',
        expected_version: 1,
      };

      expect(() => tool.validateParams(params)).toThrow();
    });

    it('should reject parameters missing expected_version', () => {
      const params = {
        artifact_id: '550e8400-e29b-41d4-a716-446655440000',
        edits: [{ old_text: 'test', new_text: 'replacement' }],
      };

      expect(() => tool.validateParams(params)).toThrow();
    });

    it('should reject empty edits array', () => {
      const params = {
        artifact_id: '550e8400-e29b-41d4-a716-446655440000',
        expected_version: 1,
        edits: [],
      };

      expect(() => tool.validateParams(params)).toThrow();
    });

    it('should reject edits with empty old_text', () => {
      const params = {
        artifact_id: '550e8400-e29b-41d4-a716-446655440000',
        expected_version: 1,
        edits: [{ old_text: '', new_text: 'replacement' }],
      };

      expect(() => tool.validateParams(params)).toThrow();
    });

    it('should reject edits missing old_text', () => {
      const params = {
        artifact_id: '550e8400-e29b-41d4-a716-446655440000',
        expected_version: 1,
        edits: [{ new_text: 'replacement' }],
      };

      expect(() => tool.validateParams(params)).toThrow();
    });

    it('should reject edits missing new_text', () => {
      const params = {
        artifact_id: '550e8400-e29b-41d4-a716-446655440000',
        expected_version: 1,
        edits: [{ old_text: 'test' }],
      };

      expect(() => tool.validateParams(params)).toThrow();
    });

    it('should reject additional properties on edits', () => {
      const params = {
        artifact_id: '550e8400-e29b-41d4-a716-446655440000',
        expected_version: 1,
        edits: [
          {
            old_text: 'test',
            new_text: 'replacement',
            extra_prop: 'not allowed',
          },
        ],
      };

      expect(() => tool.validateParams(params)).toThrow();
    });

    it('should reject additional properties on main object', () => {
      const params = {
        artifact_id: '550e8400-e29b-41d4-a716-446655440000',
        expected_version: 1,
        edits: [{ old_text: 'test', new_text: 'replacement' }],
        extra: 'not allowed',
      };

      expect(() => tool.validateParams(params)).toThrow();
    });

    it('should accept empty new_text (deletion)', () => {
      const params = {
        artifact_id: '550e8400-e29b-41d4-a716-446655440000',
        expected_version: 1,
        edits: [{ old_text: 'delete this', new_text: '' }],
      };

      const result = tool.validateParams(params);
      expect(result.edits[0].new_text).toBe('');
    });
  });

  it('should not return PII', () => {
    expect(tool.returnsPii).toBe(false);
  });
});
