import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';

export enum CrawlDomainGrantErrorCode {
  ACCESS_DENIED = 'CRAWL_DOMAIN_ACCESS_DENIED',
  ALREADY_ASSIGNED = 'CRAWL_DOMAIN_ALREADY_ASSIGNED',
  INVALID_DOMAIN = 'CRAWL_DOMAIN_INVALID',
  GRANT_NOT_FOUND = 'CRAWL_DOMAIN_GRANT_NOT_FOUND',
  UNEXPECTED_ERROR = 'CRAWL_DOMAIN_UNEXPECTED_ERROR',
}

/**
 * Raised when an org tries to crawl a host that is bound to a different org.
 * Mapped to 404 (not 403) to hide the existence of the binding, consistent
 * with the knowledge-bases hide-existence convention.
 */
export class CrawlDomainAccessDeniedError extends ApplicationError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'This domain is not available for crawling by your organization.',
      CrawlDomainGrantErrorCode.ACCESS_DENIED,
      404,
      metadata,
    );
  }
}

export class CrawlDomainAlreadyAssignedError extends ApplicationError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'This domain is already assigned to another organization.',
      CrawlDomainGrantErrorCode.ALREADY_ASSIGNED,
      409,
      metadata,
    );
  }
}

export class InvalidCrawlDomainApplicationError extends ApplicationError {
  constructor(message: string, metadata?: ErrorMetadata) {
    super(message, CrawlDomainGrantErrorCode.INVALID_DOMAIN, 400, metadata);
  }
}

export class CrawlDomainGrantNotFoundError extends ApplicationError {
  constructor(grantId: string, metadata?: ErrorMetadata) {
    super(
      `Crawl domain grant ${grantId} not found`,
      CrawlDomainGrantErrorCode.GRANT_NOT_FOUND,
      404,
      metadata,
    );
  }
}

export class UnexpectedCrawlDomainGrantError extends ApplicationError {
  constructor(operation: string, metadata?: ErrorMetadata) {
    super(
      `Unexpected crawl domain grant error during ${operation}`,
      CrawlDomainGrantErrorCode.UNEXPECTED_ERROR,
      500,
      { operation, ...metadata },
    );
  }
}
