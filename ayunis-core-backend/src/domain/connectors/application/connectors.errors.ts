import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum ConnectorErrorCode {
  UNEXPECTED_CONNECTOR_ERROR = 'UNEXPECTED_CONNECTOR_ERROR',
}

export class UnexpectedConnectorError extends ApplicationError {
  constructor(error: Error, metadata?: ErrorMetadata) {
    super(error.message, ConnectorErrorCode.UNEXPECTED_CONNECTOR_ERROR, 500, {
      ...metadata,
      error,
    });
  }
}
