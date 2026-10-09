import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';
import { getAnonymizationCauseType } from 'src/common/anonymization/application/anonymization.errors';

export enum ThreadPiiMasksErrorCode {
  UNEXPECTED_ERROR = 'UNEXPECTED_THREAD_PII_MASKS_ERROR',
  MASK_NOT_FOUND = 'THREAD_PII_MASK_NOT_FOUND',
  ORG_WHITELIST_LOOKUP_FAILED = 'THREAD_PII_MASK_ORG_WHITELIST_LOOKUP_FAILED',
  GLOBAL_WHITELIST_LOOKUP_FAILED = 'THREAD_PII_MASK_GLOBAL_WHITELIST_LOOKUP_FAILED',
  LOOKUP_FAILED = 'THREAD_PII_MASK_LOOKUP_FAILED',
  BUILD_FAILED = 'THREAD_PII_MASK_BUILD_FAILED',
  PERSISTENCE_FAILED = 'THREAD_PII_MASK_PERSISTENCE_FAILED',
}

export type ThreadPiiMaskAnonymizationStage =
  | 'org_whitelist_lookup'
  | 'global_whitelist_lookup'
  | 'existing_masks_lookup'
  | 'new_masks_build'
  | 'new_masks_persistence';

const STAGE_CODE: Record<
  ThreadPiiMaskAnonymizationStage,
  ThreadPiiMasksErrorCode
> = {
  org_whitelist_lookup: ThreadPiiMasksErrorCode.ORG_WHITELIST_LOOKUP_FAILED,
  global_whitelist_lookup:
    ThreadPiiMasksErrorCode.GLOBAL_WHITELIST_LOOKUP_FAILED,
  existing_masks_lookup: ThreadPiiMasksErrorCode.LOOKUP_FAILED,
  new_masks_build: ThreadPiiMasksErrorCode.BUILD_FAILED,
  new_masks_persistence: ThreadPiiMasksErrorCode.PERSISTENCE_FAILED,
};

export class UnexpectedThreadPiiMasksError extends ApplicationError {
  constructor(operation: string, metadata?: ErrorMetadata) {
    super(
      `Unexpected thread PII masks error during ${operation}`,
      ThreadPiiMasksErrorCode.UNEXPECTED_ERROR,
      500,
      { operation, ...metadata },
    );
  }
}

export class ThreadPiiMaskAnonymizationError extends ApplicationError {
  readonly stage: ThreadPiiMaskAnonymizationStage;

  constructor(
    stage: ThreadPiiMaskAnonymizationStage,
    metadata: ErrorMetadata,
    cause: unknown,
  ) {
    const code = STAGE_CODE[stage];
    super('Thread PII mask anonymization failed', code, 500, {
      stage,
      ...metadata,
      ...safeCauseType(cause),
      ...safeDatabaseDiagnostics(stage, cause),
    });
    this.name = code;
    this.stage = stage;
  }
}

export class ThreadPiiMaskNotFoundError extends ApplicationError {
  constructor(threadId: string, maskId: string) {
    super(
      `PII mask ${maskId} not found in thread ${threadId}`,
      ThreadPiiMasksErrorCode.MASK_NOT_FOUND,
      404,
      { threadId, maskId },
    );
  }
}

function safeCauseType(error: unknown): ErrorMetadata {
  const causeType = getAnonymizationCauseType(error);
  return causeType ? { causeType } : {};
}

function safeDatabaseDiagnostics(
  stage: ThreadPiiMaskAnonymizationStage,
  error: unknown,
): ErrorMetadata {
  if (stage !== 'existing_masks_lookup' && stage !== 'new_masks_persistence') {
    return {};
  }
  if (typeof error !== 'object' || error === null) return {};
  const record = error as Record<string, unknown>;
  return {
    ...readSafeIdentifier(record.code, 'databaseCode'),
    ...readSafeIdentifier(record.constraint, 'databaseConstraint'),
  };
}

function readSafeIdentifier(value: unknown, key: string): ErrorMetadata {
  if (
    typeof value !== 'string' ||
    value.length > 128 ||
    !/^[A-Za-z0-9_.-]+$/.test(value)
  ) {
    return {};
  }
  return { [key]: value };
}
