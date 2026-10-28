import { ApplicationError } from 'src/common/errors/base.error';

export class MarketplaceSkillNotFoundError extends ApplicationError {
  constructor(identifier: string) {
    super(
      `Marketplace skill not found: ${identifier}`,
      'MARKETPLACE_SKILL_NOT_FOUND',
      404,
    );
  }
}

export class MarketplaceIntegrationNotFoundError extends ApplicationError {
  constructor(identifier: string) {
    super(
      `Marketplace integration not found: ${identifier}`,
      'MARKETPLACE_INTEGRATION_NOT_FOUND',
      404,
    );
  }
}

export class MarketplaceUnavailableError extends ApplicationError {
  constructor() {
    super(
      'Marketplace service is currently unavailable. Please try again later.',
      'MARKETPLACE_UNAVAILABLE',
      503,
    );
  }

  override toClientResponse() {
    return { code: this.code, message: this.message };
  }
}

export class MarketplaceRequestRejectedError extends ApplicationError {
  constructor(status: number) {
    super(
      `Marketplace rejected a request from this service with status ${status}; the generated marketplace client is likely out of date`,
      'MARKETPLACE_REQUEST_REJECTED',
      502,
      { status },
    );
  }
}

export class UnexpectedMarketplaceError extends ApplicationError {
  constructor(error: unknown) {
    super('Unexpected marketplace error', 'UNEXPECTED_MARKETPLACE_ERROR', 500, {
      error,
    });
  }
}
