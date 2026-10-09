import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum AnonymizationErrorCode {
  ANONYMIZATION_FAILED = 'ANONYMIZATION_FAILED',
  ANONYMIZATION_INPUT_TOO_LONG = 'ANONYMIZATION_INPUT_TOO_LONG',
  ANONYMIZATION_WHITELIST_FILTER_FAILED = 'ANONYMIZATION_WHITELIST_FILTER_FAILED',
  ANONYMIZATION_MASK_APPLICATION_FAILED = 'ANONYMIZATION_MASK_APPLICATION_FAILED',
}

export type AnonymizationPostDetectionStage =
  'whitelist_filter' | 'mask_application';

export type AnonymizationCauseType =
  | 'Error'
  | 'TypeError'
  | 'RangeError'
  | 'ReferenceError'
  | 'SyntaxError'
  | 'URIError'
  | 'AggregateError'
  | 'QueryFailedError';

const ANONYMIZATION_CAUSE_TYPES: ReadonlySet<string> = new Set([
  'Error',
  'TypeError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'URIError',
  'AggregateError',
  'QueryFailedError',
]);

const POST_DETECTION_CODE: Record<
  AnonymizationPostDetectionStage,
  AnonymizationErrorCode
> = {
  whitelist_filter:
    AnonymizationErrorCode.ANONYMIZATION_WHITELIST_FILTER_FAILED,
  mask_application:
    AnonymizationErrorCode.ANONYMIZATION_MASK_APPLICATION_FAILED,
};

export abstract class AnonymizationError extends ApplicationError {
  constructor(
    message: string,
    code: AnonymizationErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class AnonymizationInputTooLongError extends AnonymizationError {
  constructor(length: number, maxLength: number) {
    super(
      `Text exceeds maximum anonymization length: ${length} > ${maxLength}`,
      AnonymizationErrorCode.ANONYMIZATION_INPUT_TOO_LONG,
      422,
      { length, maxLength },
    );
  }
}

export class AnonymizationFailedError extends AnonymizationError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Anonymization failed: ${reason}`,
      AnonymizationErrorCode.ANONYMIZATION_FAILED,
      500,
      metadata,
    );
  }
}

export class AnonymizationPostDetectionError extends AnonymizationError {
  readonly stage: AnonymizationPostDetectionStage;

  constructor(
    stage: AnonymizationPostDetectionStage,
    textLength: number,
    detectionCount: number,
    causeType?: AnonymizationCauseType,
  ) {
    const code = POST_DETECTION_CODE[stage];
    super('Anonymization failed after detection', code, 500, {
      stage,
      textLength,
      detectionCount,
      ...(causeType && { causeType }),
    });
    this.name = code;
    this.stage = stage;
  }
}

export function getAnonymizationCauseType(
  cause: unknown,
): AnonymizationCauseType | undefined {
  if (!(cause instanceof Error)) return undefined;
  const name = cause.constructor.name;
  return isAnonymizationCauseType(name) ? name : 'Error';
}

export function isAnonymizationCauseType(
  value: unknown,
): value is AnonymizationCauseType {
  return typeof value === 'string' && ANONYMIZATION_CAUSE_TYPES.has(value);
}
