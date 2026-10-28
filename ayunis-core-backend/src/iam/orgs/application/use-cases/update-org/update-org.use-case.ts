import { Injectable, Logger } from '@nestjs/common';
import { OrgsRepository } from 'src/iam/orgs/application/ports/orgs.repository';
import { UpdateOrgCommand } from './update-org.command';
import { Org } from 'src/iam/orgs/domain/org.entity';
import {
  OrgUpdateFailedError,
  UnexpectedOrgError,
} from 'src/iam/orgs/application/orgs.errors';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';

@Injectable()
export class UpdateOrgUseCase {
  private readonly logger = new Logger(UpdateOrgUseCase.name);

  constructor(private readonly orgsRepository: OrgsRepository) {}

  @HandleUnexpectedErrors(UnexpectedOrgError)
  async execute(command: UpdateOrgCommand): Promise<Org> {
    this.logger.log({ id: command.orgId, name: command.name }, 'update');

    if (!command.name || command.name.trim() === '') {
      this.logger.warn(
        { id: command.orgId },
        'Attempted to update organization with empty name',
      );
      throw new OrgUpdateFailedError(
        command.orgId,
        'Organization name cannot be empty',
      );
    }

    const updatedOrg = await this.orgsRepository.updateName(
      command.orgId,
      command.name,
    );
    this.logger.debug(
      { id: updatedOrg.id, name: updatedOrg.name },
      'Organization updated successfully',
    );
    return updatedOrg;
  }
}
