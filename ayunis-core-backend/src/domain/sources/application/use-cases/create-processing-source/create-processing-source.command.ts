import type { UUID } from 'crypto';

export class CreateProcessingSourceCommand {
  readonly fileType: string;
  readonly fileName: string;
  /** Pre-assigned id, so a caller can record it before the row exists. */
  readonly id?: UUID;
  readonly storageKey?: string;

  constructor(params: {
    fileType: string;
    fileName: string;
    id?: UUID;
    storageKey?: string;
  }) {
    this.fileType = params.fileType;
    this.fileName = params.fileName;
    this.id = params.id;
    this.storageKey = params.storageKey;
  }
}
