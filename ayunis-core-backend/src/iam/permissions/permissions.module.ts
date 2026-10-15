import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RolePermissionRecord } from './infrastructure/persistence/local/schema/role-permission.record';
import { TeamAdminPermissionRecord } from './infrastructure/persistence/local/schema/team-admin-permission.record';
import { TeamAdminPermissionsRepository } from './application/ports/team-admin-permissions.repository';
import { LocalTeamAdminPermissionsRepository } from './infrastructure/persistence/local/local-team-admin-permissions.repository';
import { GetTeamAdminPermissionsUseCase } from './application/use-cases/get-team-admin-permissions/get-team-admin-permissions.use-case';
import { UpdateTeamAdminPermissionsUseCase } from './application/use-cases/update-team-admin-permissions/update-team-admin-permissions.use-case';
import { TeamAdminPermissionsController } from './presenters/http/team-admin-permissions.controller';
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
  imports: [
    TypeOrmModule.forFeature([RolePermissionRecord, TeamAdminPermissionRecord]),
  ],
  controllers: [
    RolePermissionsController,
    MyPermissionsController,
    TeamAdminPermissionsController,
  ],
  providers: [
    {
      provide: RolePermissionsRepository,
      useClass: LocalRolePermissionsRepository,
    },
    {
      provide: TeamAdminPermissionsRepository,
      useClass: LocalTeamAdminPermissionsRepository,
    },
    GetTeamAdminPermissionsUseCase,
    UpdateTeamAdminPermissionsUseCase,
    HasPermissionUseCase,
    GetRolePermissionsUseCase,
    UpdateRolePermissionsUseCase,
    GetMyPermissionsUseCase,
    SeedDefaultRolePermissionsUseCase,
  ],
  // HasPermissionUseCase is exported so the PermissionsGuard (bound globally by
  // IamModule) can gate routes on stored per-role permissions;
  // SeedDefaultRolePermissionsUseCase so org creation can grant the defaults;
  // GetTeamAdminPermissionsUseCase so the teams module can check team admin
  // rights without this module importing teams; GetMyPermissionsUseCase and
  // GetRolePermissionsUseCase so the ownership module can decide who may edit
  // team and organisation resources.
  exports: [
    HasPermissionUseCase,
    SeedDefaultRolePermissionsUseCase,
    GetTeamAdminPermissionsUseCase,
    GetMyPermissionsUseCase,
    GetRolePermissionsUseCase,
  ],
})
export class PermissionsModule {}
