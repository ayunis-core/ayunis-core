import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  CONFIGURABLE_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
} from '../../../domain/default-role-permissions.constants';
import { RolePermissionsRepository } from '../../ports/role-permissions.repository';
import { UnexpectedPermissionError } from '../../permissions.errors';
import { SeedDefaultRolePermissionsCommand } from './seed-default-role-permissions.command';

/**
 * Gives a new org an explicit grant matrix for every configurable role. Called
 * inline by org creation rather than from an event listener: without these rows
 * no non-admin in the org holds any permission, so this is part of creating a
 * usable org, not a side effect of it. Existing orgs were backfilled by the
 * CreateRolePermissions migration.
 */
@Injectable()
export class SeedDefaultRolePermissionsUseCase {
  constructor(
    @InjectPinoLogger(SeedDefaultRolePermissionsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly rolePermissionsRepository: RolePermissionsRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedPermissionError)
  async execute(command: SeedDefaultRolePermissionsCommand): Promise<void> {
    this.logger.info(
      {
        orgId: command.orgId,
      },
      'Seeding default role permissions',
    );

    await this.rolePermissionsRepository.setForRoles(
      command.orgId,
      CONFIGURABLE_ROLES.map((role) => ({
        role,
        permissions: DEFAULT_ROLE_PERMISSIONS[role],
      })),
    );
  }
}
