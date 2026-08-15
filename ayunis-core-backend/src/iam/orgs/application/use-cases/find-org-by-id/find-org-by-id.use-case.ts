import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { OrgsRepository } from '../../ports/orgs.repository';
import { FindOrgByIdQuery } from './find-org-by-id.query';
import { Org } from 'src/iam/orgs/domain/org.entity';
import { OrgError, OrgNotFoundError } from '../../orgs.errors';

@Injectable()
export class FindOrgByIdUseCase {
  constructor(
    @InjectPinoLogger(FindOrgByIdUseCase.name)
    private readonly logger: PinoLogger,
    private readonly orgsRepository: OrgsRepository,
  ) {}

  async execute(query: FindOrgByIdQuery): Promise<Org> {
    this.logger.info({ id: query.id }, 'findById');
    try {
      const org = await this.orgsRepository.findById(query.id);
      this.logger.debug({ id: query.id }, 'Organization found');
      return org;
    } catch (error) {
      if (error instanceof OrgError) {
        // Error already logged and properly formatted, just rethrow
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
          id: query.id,
        },
        'Failed to find organization by ID',
      );
      throw new OrgNotFoundError(query.id);
    }
  }
}
