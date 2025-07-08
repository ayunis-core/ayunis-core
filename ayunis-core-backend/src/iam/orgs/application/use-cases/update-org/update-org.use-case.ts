import { Injectable, Logger } from '@nestjs/common';
import { OrgsRepository } from '../../ports/orgs.repository';
import { UpdateOrgCommand } from './update-org.command';
import { Org } from '../../../domain/org.entity';
import { OrgError, OrgUpdateFailedError } from '../../orgs.errors';

@Injectable()
export class UpdateOrgUseCase {
  private readonly logger = new Logger(UpdateOrgUseCase.name);

  constructor(private readonly orgsRepository: OrgsRepository) {}

  async execute(command: UpdateOrgCommand): Promise<Org> {
    this.logger.log('update', { id: command.org.id, name: command.org.name });

    try {
      this.logger.debug('Updating organization', { id: command.org.id });
      const updatedOrg = await this.orgsRepository.update(command.org);
      this.logger.debug('Organization updated successfully', {
        id: updatedOrg.id,
        name: updatedOrg.name,
      });
      return updatedOrg;
    } catch (error) {
      if (error instanceof OrgError) {
        // Error already logged and properly formatted, just rethrow
        throw error;
      }
      this.logger.error('Failed to update organization', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id: command.org.id,
      });
      throw new OrgUpdateFailedError(
        command.org.id,
        'Failed to update organization',
      );
    }
  }
}
