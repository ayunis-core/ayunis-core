import type { UUID } from 'crypto';

export class UpdateTeamPermittedModelCommand {
  public readonly permittedModelId: UUID;
  public readonly orgId: UUID;
  public readonly teamId: UUID;
  public readonly anonymousOnly?: boolean;
  public readonly internetAccessEnabled?: boolean;

  constructor(params: {
    permittedModelId: UUID;
    orgId: UUID;
    teamId: UUID;
    anonymousOnly?: boolean;
    internetAccessEnabled?: boolean;
  }) {
    this.permittedModelId = params.permittedModelId;
    this.orgId = params.orgId;
    this.teamId = params.teamId;
    this.anonymousOnly = params.anonymousOnly;
    this.internetAccessEnabled = params.internetAccessEnabled;
  }
}
