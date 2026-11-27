import type { UUID } from 'crypto';
import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum KnowledgeBaseSyncErrorCode {
  KNOWLEDGE_BASE_SYNC_DISABLED = 'KNOWLEDGE_BASE_SYNC_DISABLED',
  SYNCED_LOCATION_NOT_FOUND = 'SYNCED_LOCATION_NOT_FOUND',
  SYNCED_LOCATION_ALREADY_EXISTS = 'SYNCED_LOCATION_ALREADY_EXISTS',
  UNEXPECTED_KNOWLEDGE_BASE_SYNC_ERROR = 'UNEXPECTED_KNOWLEDGE_BASE_SYNC_ERROR',
}

/**
 * The provider of the location is switched off, e.g. connectors
 * (`FEATURE_CONNECTORS_ENABLED`).
 */
export class KnowledgeBaseSyncDisabledError extends ApplicationError {
  constructor() {
    super(
      'Synced locations are not available',
      KnowledgeBaseSyncErrorCode.KNOWLEDGE_BASE_SYNC_DISABLED,
      404,
    );
  }
}

export class SyncedLocationNotFoundError extends ApplicationError {
  constructor(locationId: UUID) {
    super(
      'Synced location not found',
      KnowledgeBaseSyncErrorCode.SYNCED_LOCATION_NOT_FOUND,
      404,
      { locationId },
    );
  }
}

export class SyncedLocationAlreadyExistsError extends ApplicationError {
  constructor(knowledgeBaseId: UUID) {
    super(
      'The knowledge base already syncs this location',
      KnowledgeBaseSyncErrorCode.SYNCED_LOCATION_ALREADY_EXISTS,
      409,
      { knowledgeBaseId },
    );
  }
}

export class UnexpectedKnowledgeBaseSyncError extends ApplicationError {
  constructor(error: Error, metadata?: ErrorMetadata) {
    super(
      error.message,
      KnowledgeBaseSyncErrorCode.UNEXPECTED_KNOWLEDGE_BASE_SYNC_ERROR,
      500,
      { ...metadata, error },
    );
  }
}
