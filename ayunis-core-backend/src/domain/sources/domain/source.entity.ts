import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { SourceType } from './source-type.enum';
import { SourceCreator } from './source-creator.enum';
import { SourceStatus } from './source-status.enum';
import type { SourceProcessingErrorCode } from './source-processing-error-code.enum';

export abstract class Source {
  id: UUID;
  type: SourceType;
  name: string;
  createdBy: SourceCreator;
  knowledgeBaseId: UUID | null;
  status: SourceStatus;
  processingError: string | null;
  processingErrorCode: SourceProcessingErrorCode | null;
  processingStartedAt: Date | null;
  /**
   * Object-storage key of the uploaded original. Retained while the source
   * exists so a worker can re-read the file; null for sources without one.
   */
  storageKey: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: {
    id?: UUID;
    type: SourceType;
    name: string;
    createdBy?: SourceCreator;
    knowledgeBaseId?: UUID | null;
    status?: SourceStatus;
    processingError?: string | null;
    processingErrorCode?: SourceProcessingErrorCode | null;
    processingStartedAt?: Date | null;
    storageKey?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.type = params.type;
    this.name = params.name;
    this.createdBy = params.createdBy ?? SourceCreator.USER;
    this.knowledgeBaseId = params.knowledgeBaseId ?? null;
    this.status = params.status ?? SourceStatus.READY;
    this.processingError = params.processingError ?? null;
    this.processingErrorCode = params.processingErrorCode ?? null;
    this.processingStartedAt = params.processingStartedAt ?? null;
    this.storageKey = params.storageKey ?? null;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
