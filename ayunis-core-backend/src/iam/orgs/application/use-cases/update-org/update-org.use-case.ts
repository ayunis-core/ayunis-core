import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { OrgsRepository } from '../../ports/orgs.repository';
import { UpdateOrgCommand } from './update-org.command';
import { Org } from 'src/iam/orgs/domain/org.entity';
import { OrgError, OrgUpdateFailedError } from '../../orgs.errors';

@Injectable()
export class UpdateOrgUseCase {
  constructor(
    @InjectPinoLogger(UpdateOrgUseCase.name)
    private readonly logger: PinoLogger,
    private readonly orgsRepository: OrgsRepository,
  ) {}

  async execute(command: UpdateOrgCommand): Promise<Org> {
    this.logger.info({ id: command.org.id, name: command.org.name }, 'update');

    try {
      this.logger.debug({ id: command.org.id }, 'Updating organization');
      const updatedOrg = await this.orgsRepository.update(command.org);
      this.logger.debug(
        {
          id: updatedOrg.id,
          name: updatedOrg.name,
        },
        'Organization updated successfully',
      );
      return updatedOrg;
    } catch (error) {
      if (error instanceof OrgError) {
        // Error already logged and properly formatted, just rethrow
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
          id: command.org.id,
        },
        'Failed to update organization',
      );
      throw new OrgUpdateFailedError(
        command.org.id,
        'Failed to update organization',
      );
    }
  }
}
