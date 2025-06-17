import { Injectable, Logger } from '@nestjs/common';
import { OrgsRepository } from '../../ports/orgs.repository';
import { DeleteOrgCommand } from './delete-org.command';
import { OrgError, OrgDeletionFailedError } from '../../orgs.errors';

@Injectable()
export class DeleteOrgUseCase {
  private readonly logger = new Logger(DeleteOrgUseCase.name);

  constructor(private readonly orgsRepository: OrgsRepository) {}

  async execute(command: DeleteOrgCommand): Promise<void> {
    this.logger.log('delete', { id: command.id });

    try {
      this.logger.debug('Deleting organization', { id: command.id });
      await this.orgsRepository.delete(command.id);
      this.logger.debug('Organization deleted successfully', {
        id: command.id,
      });
    } catch (error) {
      if (error instanceof OrgError) {
        // Error already logged and properly formatted, just rethrow
        throw error;
      }
      this.logger.error('Failed to delete organization', {
        error,
        id: command.id,
      });
      throw new OrgDeletionFailedError(
        command.id,
        'Failed to delete organization',
      );
    }
  }
}
