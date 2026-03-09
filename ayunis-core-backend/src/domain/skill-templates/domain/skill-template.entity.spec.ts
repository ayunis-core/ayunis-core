import { InvalidSkillTemplateNameError } from './skill-template.entity';
import { AlwaysOnSkillTemplate } from './always-on-skill-template.entity';
import { PreCreatedCopySkillTemplate } from './pre-created-copy-skill-template.entity';
import { DistributionMode } from './distribution-mode.enum';
import type { UUID } from 'crypto';

describe('AlwaysOnSkillTemplate', () => {
  const validParams = {
    name: 'Datenschutz-Hinweis',
    shortDescription: 'Weist auf Datenschutzrichtlinien hin',
    instructions: 'Du musst immer auf den Datenschutz achten.',
  };

  it('should always have distributionMode ALWAYS_ON', () => {
    const template = new AlwaysOnSkillTemplate(validParams);

    expect(template.distributionMode).toBe(DistributionMode.ALWAYS_ON);
  });

  it('should create with valid parameters and defaults', () => {
    const template = new AlwaysOnSkillTemplate(validParams);

    expect(template.id).toBeDefined();
    expect(template.name).toBe('Datenschutz-Hinweis');
    expect(template.shortDescription).toBe(
      'Weist auf Datenschutzrichtlinien hin',
    );
    expect(template.instructions).toBe(
      'Du musst immer auf den Datenschutz achten.',
    );
    expect(template.isActive).toBe(false);
    expect(template.createdAt).toBeInstanceOf(Date);
    expect(template.updatedAt).toBeInstanceOf(Date);
  });

  it('should use provided id when given', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000' as UUID;
    const template = new AlwaysOnSkillTemplate({ ...validParams, id });

    expect(template.id).toBe(id);
  });

  it('should use provided isActive value', () => {
    const template = new AlwaysOnSkillTemplate({
      ...validParams,
      isActive: true,
    });

    expect(template.isActive).toBe(true);
  });

  it('should use provided dates', () => {
    const createdAt = new Date('2026-01-15');
    const updatedAt = new Date('2026-02-20');
    const template = new AlwaysOnSkillTemplate({
      ...validParams,
      createdAt,
      updatedAt,
    });

    expect(template.createdAt).toEqual(createdAt);
    expect(template.updatedAt).toEqual(updatedAt);
  });
});

describe('PreCreatedCopySkillTemplate', () => {
  const validParams = {
    name: 'Willkommens-Skill',
    shortDescription: 'Begrüßt neue Nutzer',
    instructions: 'Begrüße den Nutzer freundlich.',
  };

  it('should always have distributionMode PRE_CREATED_COPY', () => {
    const template = new PreCreatedCopySkillTemplate(validParams);

    expect(template.distributionMode).toBe(DistributionMode.PRE_CREATED_COPY);
  });

  it('should default defaultActive and defaultPinned to false', () => {
    const template = new PreCreatedCopySkillTemplate(validParams);

    expect(template.defaultActive).toBe(false);
    expect(template.defaultPinned).toBe(false);
  });

  it('should accept explicit defaultActive and defaultPinned values', () => {
    const template = new PreCreatedCopySkillTemplate({
      ...validParams,
      defaultActive: true,
      defaultPinned: true,
    });

    expect(template.defaultActive).toBe(true);
    expect(template.defaultPinned).toBe(true);
  });

  it('should create with valid parameters and defaults', () => {
    const template = new PreCreatedCopySkillTemplate(validParams);

    expect(template.id).toBeDefined();
    expect(template.name).toBe('Willkommens-Skill');
    expect(template.isActive).toBe(false);
    expect(template.createdAt).toBeInstanceOf(Date);
    expect(template.updatedAt).toBeInstanceOf(Date);
  });
});

describe('Name validation', () => {
  const alwaysOnParams = {
    name: 'Valid',
    shortDescription: 'desc',
    instructions: 'instr',
  };

  it('should accept names with letters and spaces on AlwaysOnSkillTemplate', () => {
    const template = new AlwaysOnSkillTemplate({
      ...alwaysOnParams,
      name: 'Legal Research Assistant',
    });
    expect(template.name).toBe('Legal Research Assistant');
  });

  it('should accept names with hyphens on PreCreatedCopySkillTemplate', () => {
    const template = new PreCreatedCopySkillTemplate({
      ...alwaysOnParams,
      name: 'DSGVO-Konform',
    });
    expect(template.name).toBe('DSGVO-Konform');
  });

  it('should reject names with consecutive spaces', () => {
    expect(
      () => new AlwaysOnSkillTemplate({ ...alwaysOnParams, name: 'Bad  Name' }),
    ).toThrow(InvalidSkillTemplateNameError);
  });

  it('should reject empty names', () => {
    expect(
      () => new PreCreatedCopySkillTemplate({ ...alwaysOnParams, name: '' }),
    ).toThrow(InvalidSkillTemplateNameError);
  });

  it('should reject names starting with a space', () => {
    expect(
      () => new AlwaysOnSkillTemplate({ ...alwaysOnParams, name: ' Leading' }),
    ).toThrow(InvalidSkillTemplateNameError);
  });

  it('should reject names ending with a space', () => {
    expect(
      () =>
        new PreCreatedCopySkillTemplate({
          ...alwaysOnParams,
          name: 'Trailing ',
        }),
    ).toThrow(InvalidSkillTemplateNameError);
  });
});
