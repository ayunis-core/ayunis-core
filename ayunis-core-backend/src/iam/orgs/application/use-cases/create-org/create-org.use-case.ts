import { Injectable, Logger } from '@nestjs/common';
import { OrgsRepository } from '../../ports/orgs.repository';
import { CreateOrgCommand } from './create-org.command';
import { Org } from '../../../domain/org.entity';
import { OrgCreationFailedError } from '../../orgs.errors';
import { ApplicationError } from 'src/common/errors/base.error';

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

      // The webhook for org creationwill be sent in the register user use case
      // So that we can send the registered user's email and name with it

      return createdOrg;
    } catch (error) {
      if (error instanceof ApplicationError) {
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
