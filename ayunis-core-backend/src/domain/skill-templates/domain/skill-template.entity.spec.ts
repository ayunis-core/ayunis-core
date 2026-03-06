import {
  SkillTemplate,
  InvalidSkillTemplateNameError,
} from './skill-template.entity';
import { DistributionMode } from './distribution-mode.enum';
import type { UUID } from 'crypto';

describe('SkillTemplate', () => {
  const validParams = {
    name: 'Datenschutz-Hinweis',
    shortDescription: 'Weist auf Datenschutzrichtlinien hin',
    instructions: 'Du musst immer auf den Datenschutz achten.',
    distributionMode: DistributionMode.ALWAYS_ON,
  };

  describe('construction', () => {
    it('should create a skill template with valid parameters', () => {
      const template = new SkillTemplate(validParams);

      expect(template.id).toBeDefined();
      expect(template.name).toBe('Datenschutz-Hinweis');
      expect(template.shortDescription).toBe(
        'Weist auf Datenschutzrichtlinien hin',
      );
      expect(template.instructions).toBe(
        'Du musst immer auf den Datenschutz achten.',
      );
      expect(template.distributionMode).toBe(DistributionMode.ALWAYS_ON);
      expect(template.isActive).toBe(false);
      expect(template.createdAt).toBeInstanceOf(Date);
      expect(template.updatedAt).toBeInstanceOf(Date);
    });

    it('should use provided id when given', () => {
      const id = '550e8400-e29b-41d4-a716-446655440000' as UUID;
      const template = new SkillTemplate({ ...validParams, id });

      expect(template.id).toBe(id);
    });

    it('should use provided isActive value', () => {
      const template = new SkillTemplate({ ...validParams, isActive: true });

      expect(template.isActive).toBe(true);
    });

    it('should use provided dates', () => {
      const createdAt = new Date('2026-01-15');
      const updatedAt = new Date('2026-02-20');
      const template = new SkillTemplate({
        ...validParams,
        createdAt,
        updatedAt,
      });

      expect(template.createdAt).toEqual(createdAt);
      expect(template.updatedAt).toEqual(updatedAt);
    });

    it('should accept pre_created_copy distribution mode', () => {
      const template = new SkillTemplate({
        ...validParams,
        distributionMode: DistributionMode.PRE_CREATED_COPY,
      });

      expect(template.distributionMode).toBe(DistributionMode.PRE_CREATED_COPY);
    });
  });

  describe('name validation', () => {
    it('should accept names with letters and spaces', () => {
      const template = new SkillTemplate({
        ...validParams,
        name: 'Legal Research Assistant',
      });
      expect(template.name).toBe('Legal Research Assistant');
    });

    it('should accept names with hyphens', () => {
      const template = new SkillTemplate({
        ...validParams,
        name: 'DSGVO-Konform',
      });
      expect(template.name).toBe('DSGVO-Konform');
    });

    it('should accept single character names', () => {
      const template = new SkillTemplate({ ...validParams, name: 'A' });
      expect(template.name).toBe('A');
    });

    it('should accept names with special characters like &, ?, /', () => {
      expect(
        new SkillTemplate({ ...validParams, name: 'Q&A Helper' }).name,
      ).toBe('Q&A Helper');
      expect(
        new SkillTemplate({ ...validParams, name: "What's New?" }).name,
      ).toBe("What's New?");
      expect(
        new SkillTemplate({ ...validParams, name: 'Legal/Tax' }).name,
      ).toBe('Legal/Tax');
    });

    it('should accept names with underscores', () => {
      const template = new SkillTemplate({
        ...validParams,
        name: 'my_template',
      });
      expect(template.name).toBe('my_template');
    });

    it('should accept names at exactly 100 characters', () => {
      const name = 'A'.repeat(100);
      const template = new SkillTemplate({ ...validParams, name });
      expect(template.name).toBe(name);
    });

    it('should reject names over 100 characters', () => {
      const name = 'A'.repeat(101);
      expect(() => new SkillTemplate({ ...validParams, name })).toThrow(
        InvalidSkillTemplateNameError,
      );
    });

    it('should reject names with consecutive spaces', () => {
      expect(
        () => new SkillTemplate({ ...validParams, name: 'Bad  Name' }),
      ).toThrow(InvalidSkillTemplateNameError);
    });

    it('should reject empty names', () => {
      expect(() => new SkillTemplate({ ...validParams, name: '' })).toThrow(
        InvalidSkillTemplateNameError,
      );
    });

    it('should reject whitespace-only names', () => {
      expect(() => new SkillTemplate({ ...validParams, name: '   ' })).toThrow(
        InvalidSkillTemplateNameError,
      );
    });

    it('should reject names starting with a space', () => {
      expect(
        () => new SkillTemplate({ ...validParams, name: ' Leading' }),
      ).toThrow(InvalidSkillTemplateNameError);
    });

    it('should reject names ending with a space', () => {
      expect(
        () => new SkillTemplate({ ...validParams, name: 'Trailing ' }),
      ).toThrow(InvalidSkillTemplateNameError);
    });

    it('should reject names with control characters', () => {
      expect(
        () => new SkillTemplate({ ...validParams, name: 'Test\u0000Name' }),
      ).toThrow(InvalidSkillTemplateNameError);
    });

    it('should reject names with ZWJ (invisible control character)', () => {
      expect(
        () => new SkillTemplate({ ...validParams, name: 'Test\u200DName' }),
      ).toThrow(InvalidSkillTemplateNameError);
    });
  });
});
