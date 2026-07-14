import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { CrawlDomainGrantRepository } from '../../ports/crawl-domain-grant.repository';
import {
  CrawlDomainGrantNotFoundError,
  UnexpectedCrawlDomainGrantError,
} from '../../crawl-domain-grants.errors';
import { RevokeCrawlDomainCommand } from './revoke-crawl-domain.command';

@Injectable()
export class RevokeCrawlDomainUseCase {
  private readonly logger = new Logger(RevokeCrawlDomainUseCase.name);

  constructor(
    private readonly crawlDomainGrantRepository: CrawlDomainGrantRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedCrawlDomainGrantError)
  async execute(command: RevokeCrawlDomainCommand): Promise<void> {
    this.logger.log('Revoking crawl domain', {
      orgId: command.orgId,
      grantId: command.grantId,
    });

    const grant = await this.crawlDomainGrantRepository.findById(
      command.grantId,
    );
    // Scope the revoke to the named org so a grant can't be removed via the
    // wrong org's route, and return 404 (not 403) for a foreign/absent grant.
    if (grant?.orgId !== command.orgId) {
      throw new CrawlDomainGrantNotFoundError(command.grantId);
    }

    await this.crawlDomainGrantRepository.delete(command.grantId);
  }
}
