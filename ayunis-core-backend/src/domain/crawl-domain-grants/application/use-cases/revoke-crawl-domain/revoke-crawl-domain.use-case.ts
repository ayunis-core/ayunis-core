import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApplicationError } from 'src/common/errors/base.error';
import { CrawlDomainGrantRepository } from '../../ports/crawl-domain-grant.repository';
import {
  CrawlDomainGrantNotFoundError,
  UnexpectedCrawlDomainGrantError,
} from '../../crawl-domain-grants.errors';
import { RevokeCrawlDomainCommand } from './revoke-crawl-domain.command';

@Injectable()
export class RevokeCrawlDomainUseCase {
  constructor(
    @InjectPinoLogger(RevokeCrawlDomainUseCase.name)
    private readonly logger: PinoLogger,
    private readonly crawlDomainGrantRepository: CrawlDomainGrantRepository,
  ) {}

  async execute(command: RevokeCrawlDomainCommand): Promise<void> {
    this.logger.info(
      {
        orgId: command.orgId,
        grantId: command.grantId,
      },
      'Revoking crawl domain',
    );

    try {
      const grant = await this.crawlDomainGrantRepository.findById(
        command.grantId,
      );
      // Scope the revoke to the named org so a grant can't be removed via the
      // wrong org's route, and return 404 (not 403) for a foreign/absent grant.
      if (grant?.orgId !== command.orgId) {
        throw new CrawlDomainGrantNotFoundError(command.grantId);
      }

      await this.crawlDomainGrantRepository.delete(command.grantId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Error revoking crawl domain',
      );
      throw new UnexpectedCrawlDomainGrantError('revoke', {
        error: error as Error,
      });
    }
  }
}
