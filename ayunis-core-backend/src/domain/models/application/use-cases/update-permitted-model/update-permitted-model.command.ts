import type { UUID } from 'crypto';

export class UpdatePermittedModelCommand {
  public readonly permittedModelId: UUID;
  public readonly orgId: UUID;
  public readonly anonymousOnly?: boolean;
  public readonly internetAccessEnabled?: boolean;

  constructor(params: {
    permittedModelId: UUID;
    orgId: UUID;
    anonymousOnly?: boolean;
    internetAccessEnabled?: boolean;
  }) {
    this.permittedModelId = params.permittedModelId;
    this.orgId = params.orgId;
    this.anonymousOnly = params.anonymousOnly;
    this.internetAccessEnabled = params.internetAccessEnabled;
  }
}
