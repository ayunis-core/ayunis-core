import type { UUID } from 'crypto';

export class CreateSkillWithUniqueNameCommand {
  public readonly name: string;
  public readonly shortDescription: string;
  public readonly instructions: string;
  public readonly marketplaceIdentifier: string | null;
  public readonly userId: UUID;

  constructor(params: {
    name: string;
    shortDescription: string;
    instructions: string;
    marketplaceIdentifier?: string | null;
    userId: UUID;
  }) {
    this.name = params.name;
    this.shortDescription = params.shortDescription;
    this.instructions = params.instructions;
    this.marketplaceIdentifier = params.marketplaceIdentifier ?? null;
    this.userId = params.userId;
  }
}
