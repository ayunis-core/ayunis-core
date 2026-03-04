import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { DistributionMode } from './distribution-mode.enum';

/**
 * Valid skill template names: Unicode letters, numbers, emojis, hyphens, and spaces.
 * Must start and end with a letter, number, or emoji.
 * No consecutive spaces. Min length 1.
 *
 * Reuses the same pattern as Skill entity.
 */
const SKILL_TEMPLATE_NAME_PATTERN =
  /^[\p{L}\p{N}\p{Emoji_Presentation}]([\p{L}\p{N}\p{Emoji_Presentation} -]*[\p{L}\p{N}\p{Emoji_Presentation}])?$/u;
const CONSECUTIVE_SPACES = / {2}/;

export class InvalidSkillTemplateNameError extends Error {
  constructor(name: string) {
    super(
      `Invalid skill template name "${name}". Names must contain only letters, numbers, emojis, hyphens, and spaces, ` +
        `must start and end with a letter, number, or emoji, and must not contain consecutive spaces.`,
    );
    this.name = 'InvalidSkillTemplateNameError';
  }
}

function validateSkillTemplateName(name: string): void {
  if (
    !SKILL_TEMPLATE_NAME_PATTERN.test(name) ||
    CONSECUTIVE_SPACES.test(name)
  ) {
    throw new InvalidSkillTemplateNameError(name);
  }
}

export class SkillTemplate {
  public readonly id: UUID;
  public readonly name: string;
  public readonly shortDescription: string;
  public readonly instructions: string;
  public readonly distributionMode: DistributionMode;
  public readonly isActive: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(params: {
    id?: UUID;
    name: string;
    shortDescription: string;
    instructions: string;
    distributionMode: DistributionMode;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    validateSkillTemplateName(params.name);
    this.name = params.name;
    this.shortDescription = params.shortDescription;
    this.instructions = params.instructions;
    this.distributionMode = params.distributionMode;
    this.isActive = params.isActive ?? false;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
