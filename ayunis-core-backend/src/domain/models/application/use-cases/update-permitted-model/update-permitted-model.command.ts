import { UUID } from 'crypto';

export class UpdatePermittedModelCommand {
  public readonly permittedModelId: UUID;
  public readonly orgId: UUID;
  public readonly anonymousOnly: boolean;

  constructor(params: {
    permittedModelId: UUID;
    orgId: UUID;
    anonymousOnly: boolean;
  }) {
    this.permittedModelId = params.permittedModelId;
    this.orgId = params.orgId;
    this.anonymousOnly = params.anonymousOnly;
  }
}
