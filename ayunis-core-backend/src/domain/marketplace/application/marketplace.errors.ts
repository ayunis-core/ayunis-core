import { ApplicationError } from 'src/common/errors/base.error';

export class MarketplaceAgentNotFoundError extends ApplicationError {
  constructor(identifier: string) {
    super(
      `Marketplace agent not found: ${identifier}`,
      'MARKETPLACE_AGENT_NOT_FOUND',
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
