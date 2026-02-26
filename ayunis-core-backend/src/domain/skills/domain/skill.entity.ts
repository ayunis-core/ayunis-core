import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

/**
 * Valid skill names: Unicode letters, numbers, emojis, hyphens, and spaces.
 * Must start and end with a letter, number, or emoji.
 * No consecutive spaces. Min length 1.
 *
 * Uses \p{Emoji_Presentation} for visible emojis only — excludes invisible
 * components like ZWJ (U+200D) and variation selectors (U+FE0E/FE0F).
 */
const SKILL_NAME_PATTERN =
  /^[\p{L}\p{N}\p{Emoji_Presentation}]([\p{L}\p{N}\p{Emoji_Presentation} -]*[\p{L}\p{N}\p{Emoji_Presentation}])?$/u;
const CONSECUTIVE_SPACES = / {2}/;

export class InvalidSkillNameError extends Error {
  constructor(name: string) {
    super(
      `Invalid skill name "${name}". Names must contain only letters, numbers, emojis, hyphens, and spaces, ` +
        `must start and end with a letter, number, or emoji, and must not contain consecutive spaces.`,
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
    this.marketplaceIdentifier = params.marketplaceIdentifier ?? null;
    this.userId = params.userId;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
