import type { UUID } from 'crypto';

export class CreateReplacementSourceCommand {
  readonly id: UUID;
  readonly replacedSourceId: UUID;
  readonly orgId: UUID;
  readonly name: string;
  /**
   * The name its type is read from, when `name` does not tell it (a web
   * page's title); `null` to read it from `name`.
   */
  readonly fileName: string | null;
  /** The stored original of the new version. */
  readonly storageKey: string;

  constructor(params: {
    id: UUID;
    replacedSourceId: UUID;
    orgId: UUID;
    name: string;
    fileName?: string | null;
    storageKey: string;
  }) {
    this.id = params.id;
    this.replacedSourceId = params.replacedSourceId;
    this.orgId = params.orgId;
    this.name = params.name;
    this.fileName = params.fileName ?? null;
    this.storageKey = params.storageKey;
  }
}
