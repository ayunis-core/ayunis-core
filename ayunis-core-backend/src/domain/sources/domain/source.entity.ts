import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { SourceType } from './source-type.enum';
import { SourceCreator } from './source-creator.enum';
import { SourceStatus } from './source-status.enum';
import type { SourceProcessingErrorCode } from './source-processing-error-code.enum';

/**
 * Outcome of the source's ingestion runs, kept apart from `status`: a failed
 * re-run of a READY source records itself here and leaves the source READY
 * with its previous content.
 */
export interface SourceRunStateParams {
  lastIndexedAt?: Date | null;
  lastRunFailedAt?: Date | null;
  lastRunError?: string | null;
  lastRunErrorCode?: SourceProcessingErrorCode | null;
}

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
  lastIndexedAt: Date | null;
  lastRunFailedAt: Date | null;
  lastRunError: string | null;
  lastRunErrorCode: SourceProcessingErrorCode | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(
    params: {
      id?: UUID;
      type: SourceType;
      name: string;
      createdBy?: SourceCreator;
      knowledgeBaseId?: UUID | null;
      status?: SourceStatus;
      processingError?: string | null;
      processingErrorCode?: SourceProcessingErrorCode | null;
      processingStartedAt?: Date | null;
      createdAt?: Date;
      updatedAt?: Date;
    } & SourceRunStateParams,
  ) {
    this.id = params.id ?? randomUUID();
    this.type = params.type;
    this.name = params.name;
    this.createdBy = params.createdBy ?? SourceCreator.USER;
    this.knowledgeBaseId = params.knowledgeBaseId ?? null;
    this.status = params.status ?? SourceStatus.READY;
    this.processingError = params.processingError ?? null;
    this.processingErrorCode = params.processingErrorCode ?? null;
    this.processingStartedAt = params.processingStartedAt ?? null;
    this.lastIndexedAt = params.lastIndexedAt ?? null;
    this.lastRunFailedAt = params.lastRunFailedAt ?? null;
    this.lastRunError = params.lastRunError ?? null;
    this.lastRunErrorCode = params.lastRunErrorCode ?? null;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  recordIndexed(at: Date): void {
    this.lastIndexedAt = at;
    this.lastRunFailedAt = null;
    this.lastRunError = null;
    this.lastRunErrorCode = null;
  }
}
