import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RolePermissionRecord } from './infrastructure/persistence/local/schema/role-permission.record';
import { RolePermissionsRepository } from './application/ports/role-permissions.repository';
import { LocalRolePermissionsRepository } from './infrastructure/persistence/local/local-role-permissions.repository';

import { HasPermissionUseCase } from './application/use-cases/has-permission/has-permission.use-case';
import { GetRolePermissionsUseCase } from './application/use-cases/get-role-permissions/get-role-permissions.use-case';
import { UpdateRolePermissionsUseCase } from './application/use-cases/update-role-permissions/update-role-permissions.use-case';
import { GetMyPermissionsUseCase } from './application/use-cases/get-my-permissions/get-my-permissions.use-case';
import { SeedDefaultRolePermissionsUseCase } from './application/use-cases/seed-default-role-permissions/seed-default-role-permissions.use-case';

import { RolePermissionsController } from './presenters/http/role-permissions.controller';
import { MyPermissionsController } from './presenters/http/my-permissions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RolePermissionRecord])],
  controllers: [RolePermissionsController, MyPermissionsController],
  providers: [
    {
      provide: RolePermissionsRepository,
      useClass: LocalRolePermissionsRepository,
    },
    HasPermissionUseCase,
    GetRolePermissionsUseCase,
    UpdateRolePermissionsUseCase,
    GetMyPermissionsUseCase,
    SeedDefaultRolePermissionsUseCase,
  ],
  // HasPermissionUseCase is exported so the PermissionsGuard (bound globally by
  // IamModule) can gate routes on stored per-role permissions;
  // SeedDefaultRolePermissionsUseCase so org creation can grant the defaults.
  exports: [HasPermissionUseCase, SeedDefaultRolePermissionsUseCase],
})
export class PermissionsModule {}
