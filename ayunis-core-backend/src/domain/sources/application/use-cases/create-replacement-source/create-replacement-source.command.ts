import type { UUID } from 'crypto';

export class CreateReplacementSourceCommand {
  readonly id: UUID;
  readonly replacedSourceId: UUID;
  readonly orgId: UUID;
  readonly name: string;
  /** The stored original of the new version. */
  readonly storageKey: string;

  constructor(params: {
    id: UUID;
    replacedSourceId: UUID;
    orgId: UUID;
    name: string;
    storageKey: string;
  }) {
    this.id = params.id;
    this.replacedSourceId = params.replacedSourceId;
    this.orgId = params.orgId;
    this.name = params.name;
    this.storageKey = params.storageKey;
  }
}
