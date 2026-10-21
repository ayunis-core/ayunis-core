import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { TeamAdminPermissionsRepository } from 'src/iam/permissions/application/ports/team-admin-permissions.repository';
import { UnexpectedPermissionError } from 'src/iam/permissions/application/permissions.errors';
import { UpdateTeamAdminPermissionsCommand } from './update-team-admin-permissions.command';

@Injectable()
export class UpdateTeamAdminPermissionsUseCase {
  private readonly logger = new Logger(UpdateTeamAdminPermissionsUseCase.name);

  constructor(
    private readonly teamAdminPermissionsRepository: TeamAdminPermissionsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedPermissionError)
  async execute(command: UpdateTeamAdminPermissionsCommand): Promise<void> {
    this.logger.log(
      { orgId: command.orgId, count: command.permissions.length },
      'Updating team admin permissions',
    );
    await this.teamAdminPermissionsRepository.setForOrg(command.orgId, [
      ...new Set(command.permissions),
    ]);
  }
}
