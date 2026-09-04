import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

/**
 * Valid skill names: any printable characters (no control characters).
 * Must not be empty, must not start or end with whitespace, must not
 * contain consecutive spaces. Max length is enforced at the DTO layer.
 */
const CONSECUTIVE_SPACES = / {2}/;
const CONTROL_CHARS = /\p{Cc}/u;

export class InvalidSkillOwnershipError extends Error {
  constructor() {
    super('A skill must belong to exactly one user or workspace.');
    this.name = 'InvalidSkillOwnershipError';
  }
}

export class InvalidSkillNameError extends Error {
  constructor(name: string) {
    super(
      `Invalid skill name "${name}". Names must not be empty, ` +
        `must not start or end with whitespace, must not contain consecutive spaces, ` +
        `and must not contain control characters.`,
    );
    this.name = 'InvalidSkillNameError';
  }
}

function validateSkillName(name: string): void {
  if (
    name.length === 0 ||
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
  public readonly userId: UUID | null;
  public readonly workspaceId: UUID | null;
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
    userId?: UUID | null;
    workspaceId?: UUID | null;
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
    this.userId = params.userId ?? null;
    this.workspaceId = params.workspaceId ?? null;
    if ((this.userId === null) === (this.workspaceId === null)) {
      throw new InvalidSkillOwnershipError();
    }
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  get personalOwnerId(): UUID {
    if (this.userId === null) throw new InvalidSkillOwnershipError();
    return this.userId;
  }
}
