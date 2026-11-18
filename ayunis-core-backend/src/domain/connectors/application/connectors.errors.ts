import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';
import type { ConnectorProduct } from 'src/domain/connectors/domain/connector-product.enum';

export enum ConnectorErrorCode {
  CONNECTOR_CREDENTIALS_REQUIRED = 'CONNECTOR_CREDENTIALS_REQUIRED',
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

export class UnexpectedConnectorError extends ApplicationError {
  constructor(error: Error, metadata?: ErrorMetadata) {
    super(error.message, ConnectorErrorCode.UNEXPECTED_CONNECTOR_ERROR, 500, {
      ...metadata,
      error,
    });
  }
}
