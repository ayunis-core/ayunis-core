import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

/**
 * Valid skill names: any printable characters (no control characters).
 * Must not be empty, must not start or end with whitespace, must not
 * contain consecutive spaces. Min length 1, max length 100.
 */
const MAX_SKILL_NAME_LENGTH = 100;
const CONSECUTIVE_SPACES = / {2}/;
const CONTROL_CHARS = /[\p{Cc}\p{Cf}]/u;

export class InvalidSkillNameError extends Error {
  constructor(name: string) {
    super(
      `Invalid skill name "${name}". Names must be 1–100 characters, ` +
        `must not start or end with whitespace, must not contain consecutive spaces, ` +
        `and must not contain control characters.`,
    );
    this.name = 'InvalidSkillNameError';
  }
}

function validateSkillName(name: string): void {
  if (
    name.length === 0 ||
    name.length > MAX_SKILL_NAME_LENGTH ||
    name !== name.trim() ||
    CONSECUTIVE_SPACES.test(name) ||
    CONTROL_CHARS.test(name)
  ) {
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
  public readonly knowledgeBaseIds: UUID[];
  public readonly marketplaceIdentifier: string | null;
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
    knowledgeBaseIds?: UUID[];
    marketplaceIdentifier?: string | null;
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
    this.knowledgeBaseIds = params.knowledgeBaseIds ?? [];
    this.marketplaceIdentifier = params.marketplaceIdentifier ?? null;
    this.userId = params.userId;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
