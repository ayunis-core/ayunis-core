import { Injectable, Logger } from '@nestjs/common';
import { OrgsRepository } from '../../ports/orgs.repository';
import { CreateOrgCommand } from './create-org.command';
import { Org } from '../../../domain/org.entity';
import { OrgError, OrgCreationFailedError } from '../../orgs.errors';

@Injectable()
export class CreateOrgUseCase {
  private readonly logger = new Logger(CreateOrgUseCase.name);

  constructor(private readonly orgsRepository: OrgsRepository) {}

  async execute(command: CreateOrgCommand): Promise<Org> {
    this.logger.log('create', { name: command.name });

    if (!command.name || command.name.trim() === '') {
      this.logger.warn('Attempted to create organization with empty name');
      throw new OrgCreationFailedError('Organization name cannot be empty');
    }

    try {
      this.logger.debug('Creating new organization', { name: command.name });
      const org = new Org({ name: command.name });
      const createdOrg = await this.orgsRepository.create(org);
      this.logger.debug('Organization created successfully', {
        id: createdOrg.id,
        name: createdOrg.name,
      });

      return createdOrg;
    } catch (error) {
      if (error instanceof OrgError) {
        // Error already logged and properly formatted, just rethrow
        throw error;
      }
      this.logger.error('Failed to create organization', {
        error: error instanceof Error ? error.message : 'Unknown error',
        name: command.name,
      });
      throw new OrgCreationFailedError('Failed to create organization');
    }
  }
}
