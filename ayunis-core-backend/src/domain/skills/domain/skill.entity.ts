import { randomUUID, UUID } from 'crypto';

export class Skill {
  public readonly id: UUID;
  public readonly name: string;
  public readonly shortDescription: string;
  public readonly instructions: string;
  public readonly isActive: boolean;
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
    isActive?: boolean;
    sourceIds?: UUID[];
    mcpIntegrationIds?: UUID[];
    userId: UUID;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.name = params.name;
    this.shortDescription = params.shortDescription;
    this.instructions = params.instructions;
    this.isActive = params.isActive ?? false;
    this.sourceIds = params.sourceIds ?? [];
    this.mcpIntegrationIds = params.mcpIntegrationIds ?? [];
    this.userId = params.userId;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
