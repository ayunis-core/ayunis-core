import { Skill, InvalidSkillNameError } from './skill.entity';
import { UUID } from 'crypto';

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
    expect(skill.isActive).toBe(false);
    expect(skill.sourceIds).toEqual([]);
    expect(skill.mcpIntegrationIds).toEqual([]);
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

  it('should respect isActive when explicitly set to true', () => {
    const skill = new Skill({
      name: 'Active Skill',
      shortDescription: 'An active skill.',
      instructions: 'Instructions here.',
      userId: mockUserId,
      isActive: true,
    });

    expect(skill.isActive).toBe(true);
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

    it('should reject names with leading hyphens', () => {
      expect(() => new Skill({ ...validParams, name: '-Research' })).toThrow(
        InvalidSkillNameError,
      );
    });

    it('should reject names with trailing hyphens', () => {
      expect(() => new Skill({ ...validParams, name: 'Research-' })).toThrow(
        InvalidSkillNameError,
      );
    });

    it('should reject names with special characters', () => {
      expect(
        () => new Skill({ ...validParams, name: 'Legal/Research' }),
      ).toThrow(InvalidSkillNameError);
    });

    it('should reject names with underscores', () => {
      expect(
        () => new Skill({ ...validParams, name: 'Legal_Research' }),
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

    it('should reject names with unicode characters', () => {
      expect(() => new Skill({ ...validParams, name: 'Recht Résumé' })).toThrow(
        InvalidSkillNameError,
      );
    });
  });
});
