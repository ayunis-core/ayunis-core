import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { RolePermissionsRepository } from '../../ports/role-permissions.repository';
import { isConfigurableRole } from '../../../domain/default-role-permissions.constants';
import {
  RoleNotConfigurableError,
  UnexpectedPermissionError,
} from '../../permissions.errors';
import { UpdateRolePermissionsCommand } from './update-role-permissions.command';

@Injectable()
export class UpdateRolePermissionsUseCase {
  constructor(
    @InjectPinoLogger(UpdateRolePermissionsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly rolePermissionsRepository: RolePermissionsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedPermissionError)
  async execute(command: UpdateRolePermissionsCommand): Promise<void> {
    this.logger.info(
      {
        orgId: command.orgId,
        role: command.role,
        count: command.permissions.length,
      },
      'Updating role permissions',
    );

    if (!isConfigurableRole(command.role)) {
      throw new RoleNotConfigurableError(command.role);
    }

    const uniquePermissions = [...new Set(command.permissions)];

    await this.rolePermissionsRepository.setForRole(
      command.orgId,
      command.role,
      uniquePermissions,
    );
  }
}
