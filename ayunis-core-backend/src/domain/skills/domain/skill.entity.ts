import { randomUUID, UUID } from 'crypto';

/**
 * Valid skill names: letters, numbers, hyphens, and spaces.
 * Must start and end with a letter or number.
 * No consecutive spaces. Min length 1.
 */
const SKILL_NAME_PATTERN = /^[a-zA-Z0-9]([a-zA-Z0-9 -]*[a-zA-Z0-9])?$/;
const CONSECUTIVE_SPACES = / {2}/;

export class InvalidSkillNameError extends Error {
  constructor(name: string) {
    super(
      `Invalid skill name "${name}". Names must contain only letters, numbers, hyphens, and spaces, ` +
        `must start and end with a letter or number, and must not contain consecutive spaces.`,
    );
    this.name = 'InvalidSkillNameError';
  }
}

function validateSkillName(name: string): void {
  if (!SKILL_NAME_PATTERN.test(name) || CONSECUTIVE_SPACES.test(name)) {
    throw new InvalidSkillNameError(name);
  }
}

export class Skill {
  public readonly id: UUID;
  public readonly name: string;
  public readonly shortDescription: string;
  public readonly instructions: string;
  public readonly sourceIds: UUID[];
  public readonly mcpIntegrationIds: UUID[];
  public readonly userId: UUID;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(params: {
    id?: UUID;
    name: string;
    shortDescription: string;
    instructions: string;
    sourceIds?: UUID[];
    mcpIntegrationIds?: UUID[];
    userId: UUID;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    validateSkillName(params.name);
    this.name = params.name;
    this.shortDescription = params.shortDescription;
    this.instructions = params.instructions;
    this.sourceIds = params.sourceIds ?? [];
    this.mcpIntegrationIds = params.mcpIntegrationIds ?? [];
    this.userId = params.userId;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
