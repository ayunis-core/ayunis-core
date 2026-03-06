import { Skill, InvalidSkillNameError } from './skill.entity';
import type { UUID } from 'crypto';

describe('Skill Entity', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;

  it('should create a skill with required fields and generate id', () => {
    const skill = new Skill({
      name: 'Legal Research',
      shortDescription: 'Research legal topics and find case law.',
      instructions: 'You are a legal research assistant...',
      userId: mockUserId,
    });

    expect(skill.id).toBeDefined();
    expect(skill.name).toBe('Legal Research');
    expect(skill.shortDescription).toBe(
      'Research legal topics and find case law.',
    );
    expect(skill.instructions).toBe('You are a legal research assistant...');
    expect(skill.userId).toBe(mockUserId);
    expect(skill.sourceIds).toEqual([]);
    expect(skill.mcpIntegrationIds).toEqual([]);
    expect(skill.knowledgeBaseIds).toEqual([]);
    expect(skill.createdAt).toBeInstanceOf(Date);
    expect(skill.updatedAt).toBeInstanceOf(Date);
  });

  it('should create a skill with explicit id when provided', () => {
    const explicitId = '550e8400-e29b-41d4-a716-446655440000' as UUID;

    const skill = new Skill({
      id: explicitId,
      name: 'Data Analysis',
      shortDescription: 'Analyze datasets and create visualizations.',
      instructions: 'You are a data analysis expert...',
      userId: mockUserId,
    });

    expect(skill.id).toBe(explicitId);
  });

  it('should preserve source IDs and MCP integration IDs when provided', () => {
    const sourceIds = ['000e4567-e89b-12d3-a456-426614174000' as UUID];
    const mcpIds = [
      '111e4567-e89b-12d3-a456-426614174000' as UUID,
      '222e4567-e89b-12d3-a456-426614174000' as UUID,
    ];

    const skill = new Skill({
      name: 'MCP Skill',
      shortDescription: 'Skill with integrations.',
      instructions: 'Use these integrations...',
      userId: mockUserId,
      sourceIds,
      mcpIntegrationIds: mcpIds,
    });

    expect(skill.sourceIds).toEqual(sourceIds);
    expect(skill.mcpIntegrationIds).toEqual(mcpIds);
    expect(skill.mcpIntegrationIds).toHaveLength(2);
  });

  it('should preserve knowledge base IDs when provided', () => {
    const knowledgeBaseIds = [
      '333e4567-e89b-12d3-a456-426614174000' as UUID,
      '444e4567-e89b-12d3-a456-426614174000' as UUID,
    ];

    const skill = new Skill({
      name: 'KB Skill',
      shortDescription: 'Skill with knowledge bases.',
      instructions: 'Use these knowledge bases...',
      userId: mockUserId,
      knowledgeBaseIds,
    });

    expect(skill.knowledgeBaseIds).toEqual(knowledgeBaseIds);
    expect(skill.knowledgeBaseIds).toHaveLength(2);
  });

  describe('name validation', () => {
    const validParams = {
      shortDescription: 'A skill.',
      instructions: 'Do something.',
      userId: mockUserId,
    };

    it('should accept names with letters, numbers, hyphens, and spaces', () => {
      const skill = new Skill({ ...validParams, name: 'Legal Research 2' });
      expect(skill.name).toBe('Legal Research 2');
    });

    it('should accept a single-character name', () => {
      const skill = new Skill({ ...validParams, name: 'A' });
      expect(skill.name).toBe('A');
    });

    it('should accept names with hyphens in the middle', () => {
      const skill = new Skill({
        ...validParams,
        name: 'My-Custom-Skill',
      });
      expect(skill.name).toBe('My-Custom-Skill');
    });

    it('should accept names with special characters like &, ?, /', () => {
      expect(new Skill({ ...validParams, name: 'Q&A Helper' }).name).toBe(
        'Q&A Helper',
      );
      expect(new Skill({ ...validParams, name: "What's New?" }).name).toBe(
        "What's New?",
      );
      expect(new Skill({ ...validParams, name: 'Legal/Tax' }).name).toBe(
        'Legal/Tax',
      );
    });

    it('should accept names with underscores', () => {
      const skill = new Skill({ ...validParams, name: 'my_skill' });
      expect(skill.name).toBe('my_skill');
    });

    it('should accept names at exactly 100 characters', () => {
      const name = 'A'.repeat(100);
      const skill = new Skill({ ...validParams, name });
      expect(skill.name).toBe(name);
    });

    it('should reject names over 100 characters', () => {
      const name = 'A'.repeat(101);
      expect(() => new Skill({ ...validParams, name })).toThrow(
        InvalidSkillNameError,
      );
    });

    it('should reject names with leading spaces', () => {
      expect(
        () => new Skill({ ...validParams, name: ' Legal Research' }),
      ).toThrow(InvalidSkillNameError);
    });

    it('should reject names with trailing spaces', () => {
      expect(
        () => new Skill({ ...validParams, name: 'Legal Research ' }),
      ).toThrow(InvalidSkillNameError);
    });

    it('should reject names with consecutive spaces', () => {
      expect(
        () => new Skill({ ...validParams, name: 'Legal  Research' }),
      ).toThrow(InvalidSkillNameError);
    });

    it('should reject empty names', () => {
      expect(() => new Skill({ ...validParams, name: '' })).toThrow(
        InvalidSkillNameError,
      );
    });

    it('should reject whitespace-only names', () => {
      expect(() => new Skill({ ...validParams, name: '   ' })).toThrow(
        InvalidSkillNameError,
      );
    });

    it('should accept names with unicode letters', () => {
      const skill = new Skill({ ...validParams, name: 'Recht Résumé' });
      expect(skill.name).toBe('Recht Résumé');
    });

    it('should accept names with German umlauts', () => {
      const skill = new Skill({ ...validParams, name: 'Bürgerhilfe' });
      expect(skill.name).toBe('Bürgerhilfe');
    });

    it('should accept names with emojis', () => {
      const skill = new Skill({ ...validParams, name: '🔍 Research' });
      expect(skill.name).toBe('🔍 Research');
    });

    it('should accept a single emoji as name', () => {
      const skill = new Skill({ ...validParams, name: '📚' });
      expect(skill.name).toBe('📚');
    });

    it('should reject names with control characters', () => {
      expect(
        () => new Skill({ ...validParams, name: 'Test\u0000Skill' }),
      ).toThrow(InvalidSkillNameError);
    });

    it('should reject names with ZWJ (invisible control character)', () => {
      expect(
        () => new Skill({ ...validParams, name: 'Test\u200DSkill' }),
      ).toThrow(InvalidSkillNameError);
    });
  });
});
