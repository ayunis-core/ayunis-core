import { UUID } from 'crypto';

export class DeletePermittedModelCommand {
  public readonly orgId: UUID;
  public readonly permittedModelId: UUID;

  constructor(params: { orgId: UUID; permittedModelId: UUID }) {
    this.orgId = params.orgId;
    this.permittedModelId = params.permittedModelId;
  }
}
