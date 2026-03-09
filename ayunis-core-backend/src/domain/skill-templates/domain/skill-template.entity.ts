import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { DistributionMode } from './distribution-mode.enum';

/**
 * Valid skill template names: any printable characters (no control characters).
 * Must not be empty, must not start or end with whitespace, must not
 * contain consecutive spaces. Max length is enforced at the DTO layer.
 */
const CONSECUTIVE_SPACES = / {2}/;
const CONTROL_CHARS = /\p{Cc}/u;

export class InvalidSkillTemplateNameError extends Error {
  constructor(name: string) {
    super(
      `Invalid skill template name "${name}". Names must not be empty, ` +
        `must not start or end with whitespace, must not contain consecutive spaces, ` +
        `and must not contain control characters.`,
    );
    this.name = 'InvalidSkillTemplateNameError';
  }
}

function validateSkillTemplateName(name: string): void {
  if (
    name.length === 0 ||
    name !== name.trim() ||
    CONSECUTIVE_SPACES.test(name) ||
    CONTROL_CHARS.test(name)
  ) {
    throw new InvalidSkillTemplateNameError(name);
  }
}

export abstract class SkillTemplate {
  public readonly id: UUID;
  public readonly name: string;
  public readonly shortDescription: string;
  public readonly instructions: string;
  public abstract readonly distributionMode: DistributionMode;
  public readonly isActive: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  protected constructor(params: {
    id?: UUID;
    name: string;
    shortDescription: string;
    instructions: string;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    validateSkillTemplateName(params.name);
    this.name = params.name;
    this.shortDescription = params.shortDescription;
    this.instructions = params.instructions;
    this.isActive = params.isActive ?? false;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
