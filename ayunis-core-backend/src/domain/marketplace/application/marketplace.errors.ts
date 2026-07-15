import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum MarketplaceErrorCode {
  MARKETPLACE_SKILL_NOT_FOUND = 'MARKETPLACE_SKILL_NOT_FOUND',
  MARKETPLACE_INTEGRATION_NOT_FOUND = 'MARKETPLACE_INTEGRATION_NOT_FOUND',
  MARKETPLACE_UNAVAILABLE = 'MARKETPLACE_UNAVAILABLE',
  UNEXPECTED_MARKETPLACE_ERROR = 'UNEXPECTED_MARKETPLACE_ERROR',
}

export abstract class MarketplaceError extends ApplicationError {
  constructor(
    message: string,
    code: MarketplaceErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class UnexpectedMarketplaceError extends MarketplaceError {
  constructor(error: Error, metadata?: ErrorMetadata) {
    super(
      error.message,
      MarketplaceErrorCode.UNEXPECTED_MARKETPLACE_ERROR,
      500,
      {
        ...metadata,
        error,
      },
    );
  }
}

export class MarketplaceSkillNotFoundError extends MarketplaceError {
  constructor(identifier: string) {
    super(
      `Marketplace skill not found: ${identifier}`,
      MarketplaceErrorCode.MARKETPLACE_SKILL_NOT_FOUND,
      404,
    );
  }
}

export class MarketplaceIntegrationNotFoundError extends MarketplaceError {
  constructor(identifier: string) {
    super(
      `Marketplace integration not found: ${identifier}`,
      MarketplaceErrorCode.MARKETPLACE_INTEGRATION_NOT_FOUND,
      404,
    );
  }
}

export class MarketplaceUnavailableError extends MarketplaceError {
  constructor() {
    super(
      'Marketplace service is currently unavailable',
      MarketplaceErrorCode.MARKETPLACE_UNAVAILABLE,
      503,
    );
  }
}
