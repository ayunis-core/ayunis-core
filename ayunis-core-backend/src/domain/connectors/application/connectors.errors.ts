import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';
import type { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';

export enum ConnectorErrorCode {
  CONNECTOR_CREDENTIALS_REQUIRED = 'CONNECTOR_CREDENTIALS_REQUIRED',
  CONNECTOR_NOT_SET_UP = 'CONNECTOR_NOT_SET_UP',
  CONNECTOR_CONNECTION_FAILED = 'CONNECTOR_CONNECTION_FAILED',
  UNEXPECTED_CONNECTOR_ERROR = 'UNEXPECTED_CONNECTOR_ERROR',
}

/** Only a connector that is set up can keep its stored credentials. */
export class ConnectorCredentialsRequiredError extends ApplicationError {
  constructor(product: ConnectorProduct) {
    super(
      'Credentials are required to set up the connector',
      ConnectorErrorCode.CONNECTOR_CREDENTIALS_REQUIRED,
      400,
      { product },
    );
  }
}

export class ConnectorNotSetUpError extends ApplicationError {
  constructor(product: ConnectorProduct) {
    super(
      'The connector is not set up',
      ConnectorErrorCode.CONNECTOR_NOT_SET_UP,
      404,
      { product },
    );
  }
}

/** The product refused the stored credentials; testing the connection tells why. */
export class ConnectorConnectionFailedError extends ApplicationError {
  constructor(product: ConnectorProduct) {
    super(
      'The connector could not connect with its credentials',
      ConnectorErrorCode.CONNECTOR_CONNECTION_FAILED,
      422,
      { product },
    );
  }
}

export class UnexpectedConnectorError extends ApplicationError {
  constructor(error: Error, metadata?: ErrorMetadata) {
    super(error.message, ConnectorErrorCode.UNEXPECTED_CONNECTOR_ERROR, 500, {
      ...metadata,
      error,
    });
  }
}
