import type { UUID } from 'crypto';

export class UpdatePermittedModelCommand {
  public readonly permittedModelId: UUID;
  public readonly orgId: UUID;
  /** Omitted switches keep their stored value. */
  public readonly anonymousOnly?: boolean;
  public readonly memoryAccess?: boolean;

  constructor(params: {
    permittedModelId: UUID;
    orgId: UUID;
    anonymousOnly?: boolean;
    memoryAccess?: boolean;
  }) {
    this.permittedModelId = params.permittedModelId;
    this.orgId = params.orgId;
    this.anonymousOnly = params.anonymousOnly;
    this.memoryAccess = params.memoryAccess;
  }
}
