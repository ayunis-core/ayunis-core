import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum OparlErrorCode {
  INVALID_SYSTEM_URL = 'OPARL_INVALID_SYSTEM_URL',
  HOST_BLOCKED = 'OPARL_HOST_BLOCKED',
  REQUEST_FAILED = 'OPARL_REQUEST_FAILED',
  INVALID_RESPONSE = 'OPARL_INVALID_RESPONSE',
  NOT_AN_OPARL_SYSTEM = 'OPARL_NOT_AN_OPARL_SYSTEM',
  SYSTEM_ALREADY_EXISTS = 'OPARL_SYSTEM_ALREADY_EXISTS',
  SYSTEM_NOT_FOUND = 'OPARL_SYSTEM_NOT_FOUND',
  SYNC_INTERRUPTED = 'OPARL_SYNC_INTERRUPTED',
  FILE_TOO_LARGE = 'OPARL_FILE_TOO_LARGE',
  EMBEDDING_MODEL_NOT_FOUND = 'OPARL_EMBEDDING_MODEL_NOT_FOUND',
  UNEXPECTED_ERROR = 'OPARL_UNEXPECTED_ERROR',
}

export class InvalidOparlSystemUrlError extends ApplicationError {
  constructor() {
    super(
      'The OParl system URL must be an http(s) URL without credentials.',
      OparlErrorCode.INVALID_SYSTEM_URL,
      400,
    );
  }
}

/** The URL, or a redirect, leads to a private or reserved address or another scheme than http(s). */
export class OparlHostBlockedError extends ApplicationError {
  constructor(url: string) {
    super(
      'The OParl endpoint is not on a public http(s) host.',
      OparlErrorCode.HOST_BLOCKED,
      400,
      { url },
    );
  }
}

/** The endpoint could not be reached or answered with an error status. */
export class OparlRequestFailedError extends ApplicationError {
  constructor(
    url: string,
    readonly status: number | null,
    readonly retryable: boolean,
    readonly retryAfterMs: number | null = null,
    metadata?: ErrorMetadata,
  ) {
    super(
      status === null
        ? `The OParl endpoint could not be reached: ${url}`
        : `The OParl endpoint answered with HTTP ${status}: ${url}`,
      OparlErrorCode.REQUEST_FAILED,
      422,
      { url, status, ...metadata },
    );
  }
}

/** The endpoint answered with something that is not OParl JSON. */
export class OparlInvalidResponseError extends ApplicationError {
  constructor(url: string, reason: string) {
    super(
      `The OParl endpoint returned an invalid response (${reason}): ${url}`,
      OparlErrorCode.INVALID_RESPONSE,
      422,
      { url, reason },
    );
  }
}

export class NotAnOparlSystemError extends ApplicationError {
  constructor(url: string) {
    super(
      'The URL does not return an OParl System object.',
      OparlErrorCode.NOT_AN_OPARL_SYSTEM,
      422,
      { url },
    );
  }
}

export class OparlSystemAlreadyExistsError extends ApplicationError {
  constructor(url: string) {
    super(
      'This OParl system is already in the catalog.',
      OparlErrorCode.SYSTEM_ALREADY_EXISTS,
      409,
      { url },
    );
  }
}

export class OparlSystemNotFoundError extends ApplicationError {
  constructor(systemId: string) {
    super(
      `OParl system ${systemId} not found`,
      OparlErrorCode.SYSTEM_NOT_FOUND,
      404,
      { systemId },
    );
  }
}

/** The process is shutting down; the run stops between pages and resumes elsewhere. */
export class OparlSyncInterruptedError extends ApplicationError {
  constructor() {
    super(
      'The OParl sync was interrupted by a shutdown',
      OparlErrorCode.SYNC_INTERRUPTED,
      503,
    );
  }
}

export class OparlFileTooLargeError extends ApplicationError {
  constructor(url: string, maxBytes: number) {
    super(
      `The file is larger than ${maxBytes} bytes: ${url}`,
      OparlErrorCode.FILE_TOO_LARGE,
      422,
      { url, maxBytes },
    );
  }
}

/** Not an embedding model of the catalog, or an archived one. */
export class OparlEmbeddingModelNotFoundError extends ApplicationError {
  constructor(modelId: string) {
    super(
      `Embedding model ${modelId} not found in the catalog`,
      OparlErrorCode.EMBEDDING_MODEL_NOT_FOUND,
      404,
      { modelId },
    );
  }
}

export class UnexpectedOparlError extends ApplicationError {
  constructor(error: Error) {
    super('Unexpected OParl error', OparlErrorCode.UNEXPECTED_ERROR, 500, {
      error,
    });
  }
}
