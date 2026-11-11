import { randomUUID, type UUID } from 'crypto';

export interface AbstractRecordingParams {
  id?: UUID;
  name: string;
  orgId: UUID;
  /** Null once the user who created the recording has been deleted. */
  createdByUserId: UUID | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export abstract class AbstractRecording {
  readonly id: UUID;
  name: string;
  readonly orgId: UUID;
  readonly createdByUserId: UUID | null;
  readonly createdAt: Date;
  updatedAt: Date;

  protected constructor(params: AbstractRecordingParams) {
    this.id = params.id ?? randomUUID();
    this.name = params.name;
    this.orgId = params.orgId;
    this.createdByUserId = params.createdByUserId;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  rename(name: string): void {
    this.name = name;
    this.updatedAt = new Date();
  }
}
