import type { UUID } from 'crypto';

export class CreateSkillWithUniqueNameCommand {
  public readonly name: string;
  public readonly shortDescription: string;
  public readonly instructions: string;
  public readonly marketplaceIdentifier: string | null;
  public readonly userId: UUID;
  public readonly isActive: boolean;
  public readonly isPinned: boolean;

  constructor(params: {
    name: string;
    shortDescription: string;
    instructions: string;
    marketplaceIdentifier?: string | null;
    userId: UUID;
    isActive?: boolean;
    isPinned?: boolean;
  }) {
    this.name = params.name;
    this.shortDescription = params.shortDescription;
    this.instructions = params.instructions;
    this.marketplaceIdentifier = params.marketplaceIdentifier ?? null;
    this.userId = params.userId;
    this.isActive = params.isActive ?? true;
    this.isPinned = params.isPinned ?? false;
  }
}
