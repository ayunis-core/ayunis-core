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
      'Marketplace service is currently unavailable',
      'MARKETPLACE_UNAVAILABLE',
      503,
    );
  }
}
