import type { UUID } from 'crypto';

export class CreateSkillCommand {
  public readonly name: string;
  public readonly shortDescription: string;
  public readonly instructions: string;
  public readonly isActive?: boolean;
  public readonly workspaceId?: UUID;
  public readonly originSkillId?: UUID;
  public readonly importedOriginVersion?: number;
  public readonly mcpIntegrationIds?: UUID[];

  constructor(params: {
    name: string;
    shortDescription: string;
    instructions: string;
    isActive?: boolean;
    workspaceId?: UUID;
    originSkillId?: UUID;
    importedOriginVersion?: number;
    mcpIntegrationIds?: UUID[];
  }) {
    this.name = params.name;
    this.shortDescription = params.shortDescription;
    this.instructions = params.instructions;
    this.isActive = params.isActive;
    this.workspaceId = params.workspaceId;
    this.originSkillId = params.originSkillId;
    this.importedOriginVersion = params.importedOriginVersion;
    this.mcpIntegrationIds = params.mcpIntegrationIds;
  }
}
